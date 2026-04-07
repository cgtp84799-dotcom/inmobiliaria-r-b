import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
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

  const presenceUnsubRef = useRef(null);

  // ========================================
  // PRESENCIA EN TIEMPO REAL
  // ========================================

  const setupPresence = (userId, userEmail, firestoreData) => {
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }

    const userStatusRef = ref(rtdb, `status/${userId}`);
    const userRef       = doc(db, 'users', userEmail);

    const presenceData = {
      state:        'online',
      last_changed: rtdbServerTimestamp(),
      displayName:  firestoreData.displayName || userEmail.split('@')[0] || 'Usuario',
      email:        firestoreData.email || userEmail,
      photoURL:     firestoreData.photoURL || null,
      role:         firestoreData.role || 'viewer'
    };

    const connectedRef = ref(rtdb, '.info/connected');

    const unsub = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        set(userStatusRef, presenceData);
        onDisconnect(userStatusRef).set({
          state:        'offline',
          last_changed: rtdbServerTimestamp(),
          displayName:  presenceData.displayName,
          email:        presenceData.email,
          photoURL:     presenceData.photoURL,
          role:         presenceData.role
        });
      }
    });

    presenceUnsubRef.current = unsub;

    setDoc(userRef, { lastSeen: serverTimestamp(), online: true }, { merge: true })
      .catch(e => console.error('Error actualizando lastSeen:', e));
  };

  const clearPresence = async (userId, userEmail) => {
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }
    try {
      await set(ref(rtdb, `status/${userId}`), {
        state:        'offline',
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
  // SYNC: crea doc en Firestore si no existe
  // Solo para primer login — admins crean usuarios manualmente
  // ========================================

  const syncUserToFirestore = async (authUser) => {
    const userRef = doc(db, 'users', authUser.email);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid:         authUser.uid,
        email:       authUser.email,
        displayName: authUser.displayName || '',
        phone:       authUser.phoneNumber  || '',
        photoURL:    authUser.photoURL     || null,
        role:        'viewer',
        status:      'pending',
        online:      false,
        createdAt:   Timestamp.now(),
        updatedAt:   Timestamp.now(),
        lastSeen:    serverTimestamp()
      });
    }
  };

  // ========================================
  // LISTENER PRINCIPAL
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
  // FUNCIONES PÚBLICAS
  // signUp eliminado — los usuarios los crea el admin desde UserManagement
  // ========================================

  const signIn = async (email, password) => {
    try {
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

  // Helpers de rol — disponibles para cualquier componente
  const isAdmin  = userData?.role === 'admin';
  const isMember = userData?.role === 'member';
  const isViewer = userData?.role === 'viewer';

  const value = {
    currentUser,
    userData,
    loading,
    isAdmin,
    isMember,
    isViewer,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
