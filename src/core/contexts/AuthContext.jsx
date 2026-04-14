// src/core/contexts/AuthContext.jsx
//
// Cambios respecto a la versión anterior:
//   - setupPresence() solo se activa para admin y member (panel interno)
//   - Los viewers (clientes del portal) no escriben en RTDB — no necesitan presencia
//   - syncUserToFirestore no fuerza creación de /users si el cliente ya fue creado
//     por ClientAuthPage (evita race condition: no pisamos onboardingDone)
//   - La estructura y API pública no cambia — retrocompatible

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import {
  ref, set, onValue, onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';
import { auth, db, rtdb } from '../config/firebase.config';
import toast from 'react-hot-toast';
import { USER_ROLES } from '../../modules/users/types/user.types';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData,    setUserData]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const presenceUnsubRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetAuthState = () => {
    setCurrentUser(null);
    setUserData(null);
  };

  const cleanupPresenceListener = () => {
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }
  };

  // ── Presencia RTDB — SOLO para admin y member (panel interno) ──────────────
  // Los clientes del portal (viewer) no necesitan presencia en tiempo real.
  // Activar presencia para todos causaba escrituras innecesarias y exponía
  // el estado online/offline de los clientes en el panel de administración.

  const setupPresence = async (userId, userEmail, firestoreData) => {
    // Guardia: solo agentes del panel
    const role = firestoreData?.role;
    if (role === USER_ROLES.VIEWER) return;

    cleanupPresenceListener();

    const userStatusRef = ref(rtdb, `status/${userId}`);
    const userRef       = doc(db, 'users', userEmail);
    const connectedRef  = ref(rtdb, '.info/connected');

    const presenceData = {
      state:        'online',
      last_changed: rtdbServerTimestamp(),
      displayName:  firestoreData?.displayName || userEmail?.split('@')[0] || 'Usuario',
      email:        firestoreData?.email || userEmail,
      photoURL:     firestoreData?.photoURL || null,
      role,
    };

    const unsub = onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() !== true) return;
      try {
        await set(userStatusRef, presenceData);
        onDisconnect(userStatusRef).set({
          state:        'offline',
          last_changed: rtdbServerTimestamp(),
          displayName:  presenceData.displayName,
          email:        presenceData.email,
          photoURL:     presenceData.photoURL,
          role,
        });
        await setDoc(userRef, { lastSeen: serverTimestamp(), online: true }, { merge: true });
      } catch (e) {
        console.error('Error configurando presencia:', e);
      }
    });

    presenceUnsubRef.current = unsub;
  };

  const clearPresence = async (userId, userEmail) => {
    cleanupPresenceListener();
    try {
      if (userId) {
        await set(ref(rtdb, `status/${userId}`), {
          state: 'offline',
          last_changed: rtdbServerTimestamp(),
        });
      }
      if (userEmail) {
        await setDoc(
          doc(db, 'users', userEmail),
          { online: false, lastSeen: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (err) {
      console.error('Error limpiando presencia:', err);
    }
  };

  // ── Sync a Firestore ───────────────────────────────────────────────────────
  // Solo crea el documento si no existe — no lo pisa si ya fue creado por
  // ClientAuthPage (que incluye onboardingDone: false).
  // Un viewer que ya tiene su doc de usuario no lo ve sobreescrito aquí.

  const syncUserToFirestore = async (authUser) => {
    const userRef  = doc(db, 'users', authUser.email);
    const userDoc  = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid:         authUser.uid,
        email:       authUser.email,
        displayName: authUser.displayName || '',
        phone:       authUser.phoneNumber  || '',
        photoURL:    authUser.photoURL     || null,
        role:        USER_ROLES.VIEWER,
        status:      'pending',
        online:      false,
        createdAt:   Timestamp.now(),
        updatedAt:   Timestamp.now(),
        lastSeen:    serverTimestamp(),
      });
    }
  };

  // ── Listener principal ─────────────────────────────────────────────────────

  useEffect(() => {
    let unsubscribeAuth = null;
    let isMounted = true;

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.error('Error configurando persistencia:', err);
      }

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;

        if (!user) {
          cleanupPresenceListener();
          resetAuthState();
          setLoading(false);
          return;
        }

        try {
          await syncUserToFirestore(user);

          const userDocRef = doc(db, 'users', user.email);
          const userDoc    = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            console.warn('[AuthContext] Usuario sin documento en /users. Cerrando sesión.');
            await clearPresence(user.uid, user.email);
            await firebaseSignOut(auth);
            if (!isMounted) return;
            resetAuthState();
            setLoading(false);
            return;
          }

          const data = userDoc.data();
          const mergedUser = {
            ...user,
            role:        data.role        || USER_ROLES.VIEWER,
            status:      data.status      || 'pending',
            displayName: data.displayName || user.displayName || '',
            phone:       data.phone       || '',
          };

          if (!isMounted) return;

          setCurrentUser(mergedUser);
          setUserData({ id: userDoc.id, ...data });

          // Presencia solo para agentes del panel
          await setupPresence(user.uid, user.email, data);

        } catch (err) {
          console.error('Error obteniendo userData:', err);
          if (err?.code === 'permission-denied' || err?.code === 'not-found') {
            try {
              await clearPresence(user.uid, user.email);
              await firebaseSignOut(auth);
            } catch (e) {
              console.error('Error cerrando sesión tras fallo de permisos:', e);
            }
            if (!isMounted) return;
            resetAuthState();
          } else {
            if (!isMounted) return;
            setCurrentUser(user);
            setUserData(null);
          }
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      isMounted = false;
      cleanupPresenceListener();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // ── Funciones públicas ─────────────────────────────────────────────────────

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Sesión iniciada correctamente');
      return result;
    } catch (err) {
      const msgs = {
        'auth/user-not-found':    'Usuario no encontrado',
        'auth/wrong-password':    'Contraseña incorrecta',
        'auth/invalid-email':     'Correo inválido',
        'auth/user-disabled':     'Usuario deshabilitado',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/invalid-credential':'Correo o contraseña incorrectos',
      };
      throw new Error(msgs[err.code] || err.message);
    }
  };

  const signOut = async () => {
    try {
      if (currentUser?.uid || currentUser?.email) {
        await clearPresence(currentUser?.uid, currentUser?.email);
      }
      await firebaseSignOut(auth);
      resetAuthState();
      toast.success('Sesión cerrada correctamente');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      toast.error('Error al cerrar sesión');
      throw err;
    }
  };

  // ── Helpers de rol ─────────────────────────────────────────────────────────

  const role       = userData?.role;
  const isAdmin    = role === USER_ROLES.ADMIN;
  const isMember   = role === USER_ROLES.MEMBER;
  const isViewer   = role === USER_ROLES.VIEWER;
  const canOperate = isAdmin || isMember;
  const canRead    = isAdmin || isMember || isViewer;

  return (
    <AuthContext.Provider value={{
      currentUser, userData, loading,
      isAdmin, isMember, isViewer, canOperate, canRead,
      signIn, signOut,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};