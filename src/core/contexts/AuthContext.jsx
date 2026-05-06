// src/core/contexts/AuthContext.jsx
//
// Contexto de autenticación. Reglas clave:
//   - syncUserToFirestore NUNCA modifica el role de docs existentes.
//   - permission-denied NO cierra sesión (se reintenta una vez).
//   - setupPresence solo corre para admin/member (no clientes/viewers).
//   - sanitizeForRTDB elimina undefined antes de escribir en RTDB.
//   - role siempre tiene fallback a VIEWER.
//   - currentUser expuesto al Provider es un objeto plano (mezcla Auth +
//     Firestore) que NO muta el Auth User original. Componentes que
//     necesiten el Auth User puro lo leen de currentUser._authUser.

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
  //
  // Firebase dispara este callback cada vez que refresca el token (~1h),
  // así que un usuario activo 8h generaba ~8 lecturas/día gratis.
  // Ahora cacheamos en memoria el UID ya sincronizado: solo creamos el
  // doc si NO existe, y solo una vez por sesión.

  const syncedUidsRef = useRef(new Set());

  const syncUserToFirestore = async (firebaseUser) => {
    if (syncedUidsRef.current.has(firebaseUser.uid)) return;
    // Sin email no podemos crear el doc /users/{email} (la convención del
    // proyecto). Logueamos y salimos — el siguiente intento (cuando el user
    // verifique email o re-auth) sí lo creará.
    if (!firebaseUser.email) {
      console.warn('[syncUserToFirestore] Usuario sin email — sync abortado.');
      return;
    }

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

      syncedUidsRef.current.add(firebaseUser.uid);
    } catch (err) {
      console.warn('[syncUserToFirestore] error (puede ser temporal):', err.message);
    }
  };

  // ── Helper para leer y setear userData ──────────────────────────────────
  //
  // Además de leer el doc, esta función ACTIVA al staff que está pending.
  // Cuando un admin crea un usuario interno con createUserByAdmin, el doc
  // queda con status='pending'. La primera vez que el staff hace login
  // exitoso, marcamos status='active' → el trigger onUserWelcomeOnReady
  // detecta el cambio y envía el welcome del equipo.
  //
  // Sólo aplica a admin/member. Viewers usan otro flujo (verificación
  // de email).

  const loadUserData = async (firebaseUser) => {
    const userDocRef = doc(db, 'users', firebaseUser.email);
    const userDoc    = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const resolvedRole = data.role || USER_ROLES.VIEWER;
    const resolvedStatus = data.status || 'active';

    // ── Activación de staff en primer login ─────────────────────────────
    const isStaff = resolvedRole === USER_ROLES.ADMIN || resolvedRole === USER_ROLES.MEMBER;
    if (isStaff && resolvedStatus === 'pending') {
      try {
        await setDoc(
          userDocRef,
          {
            status: 'active',
            firstLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        // Refleja el cambio en el objeto que devolvemos para evitar
        // que el ProtectedRoute lo trate como inactive en este render.
        return {
          id:     userDoc.id,
          ...data,
          role:   resolvedRole,
          status: 'active',
        };
      } catch (e) {
        // Si falla la actualización (permisos / red), seguimos con el
        // doc tal cual y reintentaremos en el próximo refresh de token.
        console.warn('[AuthContext] No se pudo activar staff en primer login:', e?.message);
      }
    }

    return {
      id:     userDoc.id,
      ...data,
      role:   resolvedRole,
      status: resolvedStatus,
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
      syncedUidsRef.current.clear();
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
      {}
      {children}
    </AuthContext.Provider>
  );
};