// src/core/contexts/AuthContext.jsx
//
// ═══════════════════════════════════════════════════════════════════
// FIXES APLICADOS (TODOS):
//   1. syncUserToFirestore NUNCA modifica el role de docs existentes
//   2. permission-denied NO cierra sesión
//   3. setupPresence solo corre para admin/member
//   4. sanitizeForRTDB elimina undefined
//   5. role siempre tiene fallback a VIEWER
//   6. currentUser = objeto Auth puro, datos extra en userData
//   7. ★ FIX: Ya NO mutamos currentUser directamente (currentUser.role = ...)
//      Ahora TODO se lee desde userData.
//   8. ★ FIX: currentUser expuesto al Provider es un objeto plano seguro
//      que combina datos de Auth + Firestore SIN mutar el original.
//      Componentes que necesiten el Auth User puro: currentUser._authUser
// ═══════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
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

function sanitizeForRTDB(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForRTDB);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value === undefined ? null : sanitizeForRTDB(value);
  }
  return result;
}

export const AuthProvider = ({ children }) => {
  // authUser = objeto Auth puro de Firebase (nunca lo mutamos)
  const [authUser,  setAuthUser]  = useState(null);
  const [userData,  setUserData]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const presenceUnsubRef = useRef(null);

  const resetAuthState = () => {
    setAuthUser(null);
    setUserData(null);
  };

  const cleanupPresenceListener = () => {
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }
  };

  // ── Presencia RTDB — SOLO para admin/member ─────────────────────────────

  const setupPresence = async (userId, userEmail, firestoreData) => {
    const role = firestoreData?.role || USER_ROLES.VIEWER;
    if (role === USER_ROLES.VIEWER) return;

    cleanupPresenceListener();

    const userStatusRef = ref(rtdb, `status/${userId}`);
    const userRef       = doc(db, 'users', userEmail);
    const connectedRef  = ref(rtdb, '.info/connected');

    const presenceData = sanitizeForRTDB({
      state:        'online',
      last_changed: rtdbServerTimestamp(),
      displayName:  firestoreData?.displayName || userEmail?.split('@')[0] || 'Usuario',
      email:        firestoreData?.email || userEmail || null,
      photoURL:     firestoreData?.photoURL || null,
      role,
    });

    const offlineData = sanitizeForRTDB({
      state:        'offline',
      last_changed: rtdbServerTimestamp(),
      displayName:  presenceData.displayName,
      email:        presenceData.email,
      photoURL:     presenceData.photoURL,
      role,
    });

    const unsub = onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() !== true) return;
      try {
        await set(userStatusRef, presenceData);
        onDisconnect(userStatusRef).set(offlineData);
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
        await set(ref(rtdb, `status/${userId}`), sanitizeForRTDB({
          state: 'offline', last_changed: rtdbServerTimestamp(),
        }));
      }
      if (userEmail) {
        await setDoc(
          doc(db, 'users', userEmail),
          { online: false, lastSeen: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('clearPresence:', err.message);
    }
  };

  // ── Sync a Firestore ────────────────────────────────────────────────────

  const syncUserToFirestore = async (firebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.email);

    try {
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          phone:       firebaseUser.phoneNumber  || '',
          photoURL:    firebaseUser.photoURL     || null,
          role:        USER_ROLES.VIEWER,
          status:      'active',
          online:      false,
          createdAt:   Timestamp.now(),
          updatedAt:   Timestamp.now(),
          lastSeen:    serverTimestamp(),
        });
      } else {
        // Doc ya existe — NUNCA tocar el role
        const existingData = userDoc.data();
        if (existingData.uid !== firebaseUser.uid) {
          await setDoc(userRef, { uid: firebaseUser.uid }, { merge: true });
        }
      }
    } catch (err) {
      console.warn('[syncUserToFirestore] error (puede ser temporal):', err.message);
    }
  };

  // ── Helper para leer y setear userData ──────────────────────────────────

  const loadUserData = async (firebaseUser) => {
    const userDocRef = doc(db, 'users', firebaseUser.email);
    const userDoc    = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const resolvedRole = data.role || USER_ROLES.VIEWER;

    return {
      id:     userDoc.id,
      ...data,
      role:   resolvedRole,
      status: data.status || 'active',
    };
  };

  // ── Listener principal ──────────────────────────────────────────────────

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
          const data = await loadUserData(user);

          if (!data) {
            console.warn('[AuthContext] Usuario sin documento en /users.');
            try { await clearPresence(user.uid, user.email); } catch (_) {}
            try { await firebaseSignOut(auth); } catch (_) {}
            if (!isMounted) return;
            resetAuthState();
            setLoading(false);
            return;
          }

          if (!isMounted) return;

          setAuthUser(user);
          setUserData(data);
          await setupPresence(user.uid, user.email, data);

        } catch (err) {
          console.error('Error obteniendo userData:', err);

          if (err?.code === 'permission-denied') {
            if (!isMounted) return;
            setAuthUser(user);
            setUserData(null);

            setTimeout(async () => {
              if (!isMounted) return;
              try {
                await syncUserToFirestore(user);
                const data = await loadUserData(user);
                if (data) {
                  setAuthUser(user);
                  setUserData(data);
                  await setupPresence(user.uid, user.email, data);
                }
              } catch (retryErr) {
                console.warn('[AuthContext] reintento falló:', retryErr.message);
              }
            }, 2000);
          } else if (err?.code === 'not-found') {
            try { await clearPresence(user.uid, user.email); } catch (_) {}
            try { await firebaseSignOut(auth); } catch (_) {}
            if (!isMounted) return;
            resetAuthState();
          } else {
            if (!isMounted) return;
            setAuthUser(user);
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

  // ── Funciones públicas ──────────────────────────────────────────────────

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Sesión iniciada correctamente');
      return result;
    } catch (err) {
      const msgs = {
        'auth/user-not-found':     'Usuario no encontrado',
        'auth/wrong-password':     'Contraseña incorrecta',
        'auth/invalid-email':      'Correo inválido',
        'auth/user-disabled':      'Usuario deshabilitado',
        'auth/too-many-requests':  'Demasiados intentos. Intenta más tarde',
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
      };
      throw new Error(msgs[err.code] || err.message);
    }
  };

  const signOut = async () => {
    try {
      if (authUser?.uid || authUser?.email) {
        await clearPresence(authUser.uid, authUser.email);
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

  // ── Helpers de rol ──────────────────────────────────────────────────────

  const role       = userData?.role;
  const isAdmin    = role === USER_ROLES.ADMIN;
  const isMember   = role === USER_ROLES.MEMBER;
  const isViewer   = role === USER_ROLES.VIEWER;
  const canOperate = isAdmin || isMember;
  const canRead    = isAdmin || isMember || isViewer;

  // ★ FIX PRINCIPAL: Crear un objeto plano que combine Auth + Firestore
  // SIN mutar el Auth User original de Firebase.
  // Componentes que necesiten el Auth User puro (ej: updateProfile, getIdToken)
  // usan currentUser._authUser
  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return {
      uid:         authUser.uid,
      email:       authUser.email,
      displayName: userData?.displayName || authUser.displayName || '',
      photoURL:    userData?.photoURL    || authUser.photoURL    || null,
      emailVerified: authUser.emailVerified,
      // Datos de Firestore
      role:        userData?.role   || USER_ROLES.VIEWER,
      status:      userData?.status || 'active',
      phone:       userData?.phone  || '',
      // Referencia al Auth User original (para updateProfile, getIdToken, etc.)
      _authUser:   authUser,
    };
  }, [authUser, userData]);

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