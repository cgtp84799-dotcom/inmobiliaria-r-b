import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaHome, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../core/contexts/AuthContext';

const SettingsFab = () => {
  const [open, setOpen] = useState(false);
  const { currentUser, userData, signOut } = useAuth();
  const navigate = useNavigate();

  const wrapperRef = useRef(null);

  // ✅ Solo mostrar en panel interno
  if (!currentUser) return null;

  const displayName = useMemo(() => {
    return userData?.displayName || currentUser?.displayName || currentUser?.email || 'Usuario';
  }, [userData?.displayName, currentUser?.displayName, currentUser?.email]);

  const handleGoPublic = () => {
    navigate('/propiedades');
    setOpen(false);
  };

  const handleProfile = () => {
    // más adelante: /dashboard/perfil
    navigate('/dashboard');
    setOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setOpen(false);
  };

  // ✅ Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    // ✅ z-30 para no tapar sidebar/modales (sidebar suele ir z-40/50) [file:130]
    <div ref={wrapperRef} className="fixed bottom-4 right-4 z-30">
      {/* Botón principal */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        className="
          w-12 h-12 rounded-full
          bg-black/80 border border-primary/40
          flex items-center justify-center text-primary
          shadow-xl backdrop-blur-sm
          hover:bg-black/90 hover:border-primary/60
          transition-colors
        "
        aria-label="Configuración rápida"
        aria-expanded={open}
      >
        <FaCog className={open ? 'animate-spin-slow' : ''} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            // ✅ En móvil: que no se salga del viewport
            className="
              mt-3
              w-[min(18rem,calc(100vw-2rem))]
              max-w-[18rem]
              bg-black/95 border border-primary/40
              rounded-2xl shadow-2xl p-4
              text-sm text-slate-100
              backdrop-blur-md
              origin-bottom-right
            "
          >
            {/* Cabecera */}
            <div className="mb-3">
              <p className="font-semibold text-primary">Configuración rápida</p>
              <p className="text-slate-400 mt-1 text-xs truncate">{displayName}</p>
            </div>

            {/* Acciones */}
            <div className="space-y-2">
              <button
                onClick={handleGoPublic}
                className="
                  w-full flex items-center gap-2 px-3 py-2
                  rounded-xl bg-slate-800/70 hover:bg-slate-700/70
                  text-xs border border-slate-700
                  transition-colors
                "
              >
                <FaHome className="text-primary" />
                <span className="flex-1 text-left">Ver como cliente (catálogo)</span>
              </button>

              <button
                onClick={handleProfile}
                className="
                  w-full flex items-center gap-2 px-3 py-2
                  rounded-xl bg-slate-800/70 hover:bg-slate-700/70
                  text-xs border border-slate-700
                  transition-colors
                "
              >
                <FaUser className="text-primary" />
                <span className="flex-1 text-left">Volver al dashboard</span>
              </button>

              <button
                onClick={handleLogout}
                className="
                  w-full flex items-center gap-2 px-3 py-2
                  rounded-xl bg-red-600/90 hover:bg-red-500
                  text-xs text-white
                  transition-colors
                "
              >
                <FaSignOutAlt />
                <span className="flex-1 text-left">Cerrar sesión</span>
              </button>
            </div>

            <p className="mt-3 text-[10px] text-slate-500 leading-snug">
              Tip: presiona Esc para cerrar.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsFab;