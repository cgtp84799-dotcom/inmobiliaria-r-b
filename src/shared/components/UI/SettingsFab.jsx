import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaHome, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config'; // ✅ fix #1

const SettingsFab = () => {
  const [open, setOpen] = useState(false);
  const { currentUser, userData, signOut } = useAuth();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  // ✅ fix #5: sin useMemo para strings baratos
  const displayName =
    userData?.displayName || currentUser?.displayName || currentUser?.email || 'Usuario';

  const handleGoPublic = () => { navigate('/propiedades'); setOpen(false); };
  const handleProfile  = () => { navigate(PRIVATE_ROUTES.PROFILE); setOpen(false); };

  // ✅ fix #6: cerrar antes del await para evitar setState en componente desmontado
  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  // ✅ fix #3: useEffect ANTES del return condicional
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Todos los hooks están arriba — ahora sí es seguro el early return
  if (!currentUser) return null;

  return (
    <div ref={wrapperRef} className="fixed bottom-4 right-4 z-30">
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
        {/* ✅ fix #4: animate-spin estándar (animate-spin-slow no está definido en el config) */}
        <FaCog className={open ? 'animate-spin' : ''} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
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
            <div className="mb-3">
              <p className="font-semibold text-primary">Configuración rápida</p>
              <p className="text-slate-400 mt-1 text-xs truncate">{displayName}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleGoPublic}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                  bg-slate-800/70 hover:bg-slate-700/70 text-xs border border-slate-700 transition-colors"
              >
                <FaHome className="text-primary" />
                <span className="flex-1 text-left">Ver como cliente (catálogo)</span>
              </button>

              {/* ✅ fix #2: label corregido a "Mi perfil" */}
              <button
                onClick={handleProfile}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                  bg-slate-800/70 hover:bg-slate-700/70 text-xs border border-slate-700 transition-colors"
              >
                <FaUser className="text-primary" />
                <span className="flex-1 text-left">Mi perfil</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                  bg-red-600/90 hover:bg-red-500 text-xs text-white transition-colors"
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