// src/modules/auth/pages/EmailVerificationPage.jsx
//
// Página intermedia que se muestra cuando el usuario inicia sesión pero
// aún no ha verificado su email. Sin verificar, no se puede acceder al
// portal — esto previene el spam de cuentas falsas.
//
// Flujo:
//   1. El usuario crea cuenta → se le envía email automáticamente.
//   2. Es redirigido aquí.
//   3. Mientras espera, hace click en el link del email.
//   4. La página revisa periódicamente si ya verificó (cada 4s) y, cuando
//      detecta que sí, redirige al portal.
//   5. Puede reenviar el email (con cooldown de 60s para evitar abuso).

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaEnvelope, FaSpinner, FaCheckCircle, FaSignOutAlt,
  FaPaperPlane, FaSyncAlt,
} from 'react-icons/fa';
import {
  reload, signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from '../../../core/config/routes.config';
import { requestEmailVerification } from '../services/emailVerification.service';
import toast from 'react-hot-toast';

const RESEND_COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 4000;

export default function EmailVerificationPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);
  const cooldownRef = useRef(null);
  const pollRef = useRef(null);

  const email = currentUser?.email || '';
  const displayName =
    currentUser?.displayName || (email ? email.split('@')[0] : 'Usuario');

  // ─── Sin sesión → mandar al login ───────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!currentUser) navigate(PUBLIC_ROUTES.CLIENT_AUTH, { replace: true });
  }, [currentUser, loading, navigate]);

  // ─── Si ya verificó (entró por Google o ya hizo click) → portal ────
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.emailVerified || currentUser._authUser?.emailVerified) {
      navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
    }
  }, [currentUser, navigate]);

  // ─── Polling: revisar si ya verificó en otra pestaña ────────
  useEffect(() => {
    if (!currentUser) return;

    const tick = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) return;
        await reload(authUser);
        if (authUser.emailVerified) {
          // Marcar también en Firestore para que las rules / queries
          // que dependan de ello vean el cambio.
          try {
            const email = String(authUser.email || '').toLowerCase().trim();
            if (email) {
              await updateDoc(doc(db, 'users', email), {
                emailVerified: true,
                emailVerifiedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch {
            // No crítico: el ProtectedRoute lo dejará pasar igual con
            // currentUser._authUser.emailVerified.
          }
          toast.success('¡Email verificado!');
          if (pollRef.current) clearInterval(pollRef.current);
          navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
        }
      } catch {
        // Silencioso: errores de red no deben molestar.
      }
    };

    pollRef.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentUser, navigate]);

  // ─── Cooldown del botón "Reenviar" ──────────────────────────
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  // ─── Acciones ───────────────────────────────────────────────
  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      const authUser = auth.currentUser;
      if (!authUser) throw new Error('No hay sesión activa');
      // Llama a la Cloud Function custom (NO al sendEmailVerification de
      // Firebase Auth, cuya plantilla no se puede personalizar).
      const result = await requestEmailVerification();
      if (result?.alreadyVerified) {
        toast.success('Tu email ya está verificado.');
        navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
        return;
      }
      toast.success('Email reenviado. Revisa tu bandeja.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error('[EmailVerification] resend error:', err);
      if (err.status === 429 || err.code === 'http_429') {
        toast.error('Demasiados envíos. Espera unos minutos.');
        setCooldown(RESEND_COOLDOWN_SECONDS * 5);
      } else if (err.status === 401) {
        toast.error('Sesión expirada. Vuelve a iniciar sesión.');
        navigate(PUBLIC_ROUTES.CLIENT_AUTH, { replace: true });
      } else {
        toast.error('No pudimos reenviar el email. Intenta más tarde.');
      }
    } finally {
      setResending(false);
    }
  };

  const handleCheckNow = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const authUser = auth.currentUser;
      if (!authUser) throw new Error('No hay sesión activa');
      await reload(authUser);
      if (authUser.emailVerified) {
        toast.success('¡Email verificado!');
        navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
      } else {
        toast('Aún no detectamos la verificación. Revisa tu correo.', { icon: '⏳' });
      }
    } catch (err) {
      console.error('[EmailVerification] check error:', err);
      toast.error('No pudimos verificar el estado. Intenta de nuevo.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      navigate(PUBLIC_ROUTES.CLIENT_AUTH, { replace: true });
    } catch (err) {
      console.error('[EmailVerification] signOut error:', err);
    }
  };

  if (loading || !currentUser) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <FaSpinner
          className="animate-spin text-3xl"
          style={{ color: 'var(--color-gold)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--color-bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl p-7 sm:p-9 border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Icono */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, var(--color-gold-soft) 0%, var(--color-gold) 100%)',
              boxShadow: '0 8px 24px rgba(180, 83, 9, 0.18)',
            }}
          >
            <FaEnvelope size={32} style={{ color: 'var(--color-bg)' }} />
          </div>
        </div>

        <h1
          className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          Verifica tu email
        </h1>

        <p
          className="text-sm text-center mb-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Hola {displayName} 👋
        </p>

        <p
          className="text-sm text-center mb-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Te enviamos un correo a{' '}
          <span
            className="font-semibold break-all"
            style={{ color: 'var(--color-text)' }}
          >
            {email}
          </span>
          . Haz click en el enlace del correo para activar tu cuenta y
          acceder al portal.
        </p>

        {/* Tip */}
        <div
          className="rounded-xl p-3 mb-6 text-xs leading-relaxed"
          style={{
            background: 'var(--color-inner-card)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-divider)',
          }}
        >
          <strong style={{ color: 'var(--color-text)' }}>¿No lo ves?</strong>{' '}
          Revisa la carpeta de <em>spam</em> o <em>promociones</em>. El correo
          viene de <em>Inmobiliaria Rincón Bedoya y Asociados</em>.
        </div>

        {/* Botones */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleCheckNow}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-bg)',
              boxShadow: '0 4px 14px rgba(180, 83, 9, 0.22)',
            }}
            onMouseEnter={(e) => {
              if (!checking) e.currentTarget.style.background = 'var(--color-gold-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-gold)';
            }}
          >
            {checking ? (
              <FaSpinner className="animate-spin" size={14} />
            ) : (
              <FaCheckCircle size={14} />
            )}
            {checking ? 'Verificando…' : 'Ya hice click, continuar'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-inner-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            onMouseEnter={(e) => {
              if (!resending && cooldown <= 0)
                e.currentTarget.style.background = 'var(--color-row-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-inner-card)';
            }}
          >
            {resending ? (
              <FaSpinner className="animate-spin" size={12} />
            ) : (
              <FaPaperPlane size={12} />
            )}
            {cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : resending
                ? 'Enviando…'
                : 'Reenviar correo de verificación'}
          </button>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <FaSignOutAlt size={10} />
              Salir y usar otro correo
            </button>
          </div>
        </div>

        {/* Indicador de polling discreto */}
        <p
          className="mt-6 text-[10px] text-center flex items-center justify-center gap-1.5"
          style={{ color: 'var(--color-text-faint)' }}
        >
          <FaSyncAlt
            className="animate-spin"
            size={9}
            style={{ animationDuration: '3s' }}
          />
          Verificando automáticamente…
        </p>
      </motion.div>
    </div>
  );
}