import { createContext, useContext, useState, useEffect } from 'react';
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
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ========================================
  // PRESENCIA EN TIEMPO REAL
  // ========================================
  
  const setupPresence = async (userId, userEmail) => {
    try {
      const userStatusRef = ref(rtdb, `status/${userId}`);
      const userRef = doc(db, 'users', userEmail); // Usar email como ID

      // Obtener datos del usuario
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data();

      // Datos de presencia
      const presenceData = {
        state: 'online',
        last_changed: rtdbServerTimestamp(),
        displayName: userData.displayName || userData.email?.split('@')[0] || 'Usuario',
        email: userData.email || '',
        photoURL: userData.photoURL || null,
        role: userData.role || 'viewer'
      };

      // Info de conexión de Firebase
      const connectedRef = ref(rtdb, '.info/connected');
      
      onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          // Usuario conectado
          set(userStatusRef, presenceData);

          // Cuando se desconecte, marcar como offline
          onDisconnect(userStatusRef).set({
            state: 'offline',
            last_changed: rtdbServerTimestamp(),
            displayName: presenceData.displayName,
            email: presenceData.email,
            photoURL: presenceData.photoURL,
            role: presenceData.role
          });
        }
      });

      // También actualizar en Firestore
      await setDoc(userRef, {
        ...userData,
        lastSeen: serverTimestamp(),
        online: true
      }, { merge: true });
    } catch (error) {
      console.error('Error configurando presencia:', error);
    }
  };

  const clearPresence = async (userId, userEmail) => {
    try {
      const userStatusRef = ref(rtdb, `status/${userId}`);
      const userRef = doc(db, 'users', userEmail);

      await set(userStatusRef, {
        state: 'offline',
        last_changed: rtdbServerTimestamp()
      });

      await setDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error limpiando presencia:', error);
    }
  };

  // ========================================
  // SINCRONIZAR USUARIO A FIRESTORE
  // ========================================
  
  const syncUserToFirestore = async (authUser, defaultRole = 'viewer') => {
    try {
      const userRef = doc(db, 'users', authUser.email);
      const userDoc = await getDoc(userRef);

      // Si NO existe en Firestore, créalo
      if (!userDoc.exists()) {
        console.log(`✅ Sincronizando usuario ${authUser.email} a Firestore...`);
        
        await setDoc(userRef, {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName || '',
          phone: authUser.phoneNumber || '',
          photoURL: authUser.photoURL || null,
          role: defaultRole,
          status: 'pending', // Pendiente hasta que admin apruebe
          online: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastSeen: serverTimestamp()
        });

        console.log(`✅ Usuario ${authUser.email} sincronizado exitosamente`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sincronizando usuario:', error);
      return false;
    }
  };

  // ========================================
  // LISTENER DE AUTENTICACIÓN
  // ========================================
  
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // ✅ Sincronizar a Firestore si no existe
          await syncUserToFirestore(user);

          // Obtener datos completos de Firestore usando EMAIL como ID
          const userDocRef = doc(db, 'users', user.email);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Combinar datos de Auth y Firestore
            setCurrentUser({
              ...user,
              role: data.role || 'viewer',
              status: data.status || 'pending',
              displayName: data.displayName || user.displayName,
              phone: data.phone || ''
            });
            
            setUserData(data);
            
            // Configurar presencia
            await setupPresence(user.uid, user.email);
          } else {
            // Si por alguna razón no se sincronizó, usar datos básicos
            setCurrentUser({
              ...user,
              role: 'viewer',
              status: 'pending'
            });
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
      const result = await signInWithEmailAndPassword(auth, email, password);
      await setupPresence(result.user.uid, result.user.email);
      toast.success('Sesión iniciada correctamente');
      return result;
    } catch (error) {
      console.error('Error en signIn:', error);
      
      const errorMessages = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/user-disabled': 'Usuario deshabilitado',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
      };
      
      throw new Error(errorMessages[error.code] || error.message);
    }
  };

  const signUp = async (email, password, displayName = '') => {
    try {
      setLoading(true);
      
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Actualizar perfil con displayName
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // 3. ✅ CREAR DOCUMENTO EN FIRESTORE AUTOMÁTICAMENTE
      const userDocRef = doc(db, 'users', email);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: email,
        displayName: displayName || '',
        phone: '',
        photoURL: null,
        role: 'viewer', // Por defecto es viewer hasta que admin apruebe
        status: 'pending', // Pendiente de aprobación
        online: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastSeen: serverTimestamp()
      });

      toast.success('Cuenta creada exitosamente. Espera aprobación del administrador.');
      return userCredential;
    } catch (error) {
      console.error('Error en registro:', error);
      
      const errorMessages = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido'
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

  // ========================================
  // VALOR DEL CONTEXTO
  // ========================================
  
  const value = {
    currentUser,
    userData,
    loading,
    signIn,
    signUp, // ✅ AGREGADO
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};