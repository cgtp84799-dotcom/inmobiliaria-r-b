import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, set, onValue, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { auth, db, rtdb } from '../config/firebase.config';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser]   = useState(null);
  const [userData, setUserData]         = useState(null);
  const [loading, setLoading]           = useState(true);

  // Guarda el unsubscribe del listener .info/connected para limpiarlo al logout
  const presenceUnsubRef = useRef(null);

  // ========================================
  // PRESENCIA EN TIEMPO REAL
  // Recibe userData ya leído — sin getDoc extra
  // ========================================

  const setupPresence = (userId, userEmail, firestoreData) => {
    // Limpiar listener anterior si existe (evita acumulación en re-renders)
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }

    const userStatusRef = ref(rtdb, `status/${userId}`);
    const userRef       = doc(db, 'users', userEmail);

    const presenceData = {
      state:       'online',
      last_changed: rtdbServerTimestamp(),
      displayName: firestoreData.displayName || userEmail.split('@')[0] || 'Usuario',
      email:       firestoreData.email || userEmail,
      photoURL:    firestoreData.photoURL || null,
      role:        firestoreData.role || 'viewer'
    };

    const connectedRef = ref(rtdb, '.info/connected');

    const unsub = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        set(userStatusRef, presenceData);

        onDisconnect(userStatusRef).set({
          state:       'offline',
          last_changed: rtdbServerTimestamp(),
          displayName:  presenceData.displayName,
          email:        presenceData.email,
          photoURL:     presenceData.photoURL,
          role:         presenceData.role
        });
      }
    });

    presenceUnsubRef.current = unsub;

    // Actualizar lastSeen en Firestore (fire-and-forget, sin await)
    setDoc(userRef, { lastSeen: serverTimestamp(), online: true }, { merge: true })
      .catch(e => console.error('Error actualizando lastSeen:', e));
  };

  const clearPresence = async (userId, userEmail) => {
    // Limpiar listener de conexión
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }

    try {
      await set(ref(rtdb, `status/${userId}`), {
        state:       'offline',
        last_changed: rtdbServerTimestamp()
      });

      await setDoc(doc(db, 'users', userEmail), {
        online:   false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error limpiando presencia:', error);
    }
  };

  // ========================================
  // SINCRONIZAR USUARIO A FIRESTORE
  // Solo crea el doc si NO existe — para logins de usuarios ya registrados
  // signUp crea el doc directamente y nunca llega aquí a escribir
  // ========================================

  const syncUserToFirestore = async (authUser) => {
    const userRef = doc(db, 'users', authUser.email);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid:         authUser.uid,
        email:       authUser.email,
        displayName: authUser.displayName || '',
        phone:       authUser.phoneNumber || '',
        photoURL:    authUser.photoURL    || null,
        role:        'viewer',
        status:      'pending',
        online:      false,
        createdAt:   Timestamp.now(),
        updatedAt:   Timestamp.now(),
        lastSeen:    serverTimestamp()
      });
      return true; // doc recién creado
    }

    return false; // ya existía
  };

  // ========================================
  // LISTENER DE AUTENTICACIÓN
  // Un solo flujo: sync → getDoc → estado → presencia
  // setupPresence recibe los datos ya leídos, sin segunda lectura
  // ========================================

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await syncUserToFirestore(user);

          const userDocRef = doc(db, 'users', user.email);
          const userDoc    = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();

            setCurrentUser({
              ...user,
              role:        data.role        || 'viewer',
              status:      data.status      || 'pending',
              displayName: data.displayName || user.displayName || '',
              phone:       data.phone       || ''
            });
            setUserData(data);

            // ✅ Presencia recibe los datos ya leídos — sin getDoc extra
            setupPresence(user.uid, user.email, data);
          } else {
            setCurrentUser({ ...user, role: 'viewer', status: 'pending' });
            setUserData(null);
          }
        } catch (error) {
          console.error('Error obteniendo userData:', error);
          setCurrentUser(user);
          setUserData(null);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ========================================
  // FUNCIONES DE AUTENTICACIÓN
  // ========================================

  const signIn = async (email, password) => {
    try {
      // onAuthStateChanged se dispara solo después de esto —
      // NO llamar setupPresence aquí para evitar la doble ejecución
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Sesión iniciada correctamente');
      return result;
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found':     'Usuario no encontrado',
        'auth/wrong-password':     'Contraseña incorrecta',
        'auth/invalid-email':      'Correo electrónico inválido',
        'auth/user-disabled':      'Usuario deshabilitado',
        'auth/too-many-requests':  'Demasiados intentos. Intenta más tarde',
        'auth/invalid-credential': 'Correo o contraseña incorrectos'
      };
      throw new Error(errorMessages[error.code] || error.message);
    }
  };

  const signUp = async (email, password, displayName = '') => {
    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Crear doc directamente — syncUserToFirestore lo encontrará y no duplicará
      await setDoc(doc(db, 'users', email), {
        uid:         user.uid,
        email:       email,
        displayName: displayName || '',
        phone:       '',
        photoURL:    null,
        role:        'viewer',
        status:      'pending',
        online:      false,
        createdAt:   Timestamp.now(),
        updatedAt:   Timestamp.now(),
        lastSeen:    serverTimestamp()
      });

      toast.success('Cuenta creada. Espera aprobación del administrador.');
      return userCredential;
    } catch (error) {
      const errorMessages = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email':        'Correo electrónico inválido'
      };
      throw new Error(errorMessages[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (currentUser) {
        await clearPresence(currentUser.uid, currentUser.email);
      }
      await firebaseSignOut(auth);
      setUserData(null);
      setCurrentUser(null);
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
      throw error;
    }
  };

  const value = { currentUser, userData, loading, signIn, signUp, signOut };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};