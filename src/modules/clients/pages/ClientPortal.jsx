// src/modules/clients/pages/ClientPortal.jsx
//
// FIX: WelcomeModal volvía a aparecer porque:
//   1. onDone() primero llamaba finishOnboarding() (escritura async a Firestore)
//   2. Si la escritura fallaba por permisos → onboardingDone seguía false → modal re-aparecía
//   3. Incluso si tenía éxito, había un flash de 1-2s mientras Firestore actualizaba
//
// SOLUCIÓN: dismissWelcome() se llama PRIMERO (ocultar localmente de inmediato),
// y finishOnboarding() corre en background. El modal nunca vuelve a aparecer en
// la misma sesión gracias al estado local `dismissed` en useWelcome.

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
  FaUser, FaSignOutAlt, FaSpinner, FaChevronDown,
  FaHistory, FaBalanceScale,
} from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { useForceDark } from '../../../core/contexts/ThemeContext';
import { useClientPortal } from '../hooks/useClientPortal';
import { useWelcome }       from '../hooks/useWelcome';
import toast from 'react-hot-toast';

import SectionInicio    from '../components/portal/SectionInicio';
import SectionFavoritos from '../components/portal/SectionFavoritos';
import SectionComparar  from '../components/portal/SectionComparar';
import SectionActividad from '../components/portal/SectionActividad';
import SectionVisitas   from '../components/portal/SectionVisitas';
import SectionContratos from '../components/portal/SectionContratos';
import SectionPerfil    from '../components/portal/SectionPerfil';
import PortalNotificationBell from '../components/portal/PortalNotificationBell';
import WelcomeModal from '../components/WelcomeModal';

const TAB_DEFS = [
  { id: 'inicio',    label: 'Inicio',      icon: FaHome,         always: true  },
  { id: 'favoritos', label: 'Favoritos',   icon: FaHeart,        always: true  },
  { id: 'comparar',  label: 'Comparar',    icon: FaBalanceScale, always: false, needsFavs: true },
  { id: 'visitas',   label: 'Mis visitas', icon: FaCalendarAlt,  always: false },
  { id: 'contratos', label: 'Contratos',   icon: FaFileContract, always: false },
  { id: 'actividad', label: 'Actividad',   icon: FaHistory,      always: false, needsActivity: true },
  { id: 'perfil',    label: 'Mi perfil',   icon: FaUser,         always: true  },
];

function UserMenu({ name, photo, onProfile, onSignOut }) {
  const [open, setOpen] = useState(false);
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/60 transition"
      >
        {photo ? (
          <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/30" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-slate-300 max-w-[120px] truncate">
          {name.split(' ')[0]}
        </span>
        <FaChevronDown className={`text-slate-500 text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700/60 rounded-xl shadow-xl z-40 overflow-hidden py-1"
            >
              <button
                onClick={() => { setOpen(false); onProfile(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition"
              >
                <FaUser className="text-xs text-slate-500" /> Mi perfil
              </button>
              <div className="mx-3 my-1 border-t border-slate-800" />
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
              >
                <FaSignOutAlt className="text-xs" /> Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClientPortal() {
  useForceDark();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('inicio');

  const portal = useClientPortal();
  const { showWelcome, dismiss: dismissWelcome } = useWelcome(portal.onboardingDone, portal.loading);

  const visibleTabs = useMemo(() => TAB_DEFS.filter((t) => {
    if (t.always)        return true;
    if (t.needsFavs)     return portal.favProps.length >= 2;
    if (t.needsActivity) return portal.visits.length > 0 || portal.notifications.length > 0;
    if (t.id === 'visitas')   return portal.hasVisits;
    if (t.id === 'contratos') return portal.hasContracts;
    return false;
  }), [portal.favProps.length, portal.visits.length, portal.notifications.length, portal.hasVisits, portal.hasContracts]);

  useEffect(() => {
    if (!visibleTabs.find((t) => t.id === tab)) setTab('inicio');
  }, [visibleTabs, tab]);

  async function handleSignOut() {
    try {
      await signOut(auth);
      navigate('/acceso-clientes', { replace: true });
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }

  // FIX: cerrar modal PRIMERO (local), luego escribir a Firestore en background
  // Antes: await finishOnboarding() → si fallaba, el modal volvía
  // Ahora: dismiss() local inmediato → finishOnboarding() async sin bloquear
  function handleModalDone() {
    dismissWelcome();                    // ← ocultar AHORA, no esperar a Firestore
    portal.finishOnboarding();          // ← escribir en background (no await)
  }

  const displayName = portal.clientData?.nombre
    || userData?.displayName
    || currentUser?.displayName
    || currentUser?.email?.split('@')[0]
    || 'Cliente';
  const photoURL = currentUser?.photoURL || userData?.photoURL || null;

  if (portal.loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="text-amber-500 text-3xl animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ colorScheme: 'dark' }}>

      {/* Welcome Modal — se oculta localmente de inmediato al cerrar */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal
            clientId={portal.clientId}
            clientData={portal.clientData}
            onDone={handleModalDone}
          />
        )}
      </AnimatePresence>

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/catalogo" className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src="/logo-ryb.png" alt="RyB" className="h-7 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-amber-400 font-bold text-sm tracking-wide hidden sm:block">
              RINCÓN BEDOYA
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <PortalNotificationBell
              notifications={portal.notifications}
              unreadCount={portal.unreadCount}
              onRead={portal.readNotification}
              onReadAll={portal.readAllNotifications}
              onDelete={portal.removeNotification}
            />
            <UserMenu
              name={displayName}
              photo={photoURL}
              onProfile={() => setTab('perfil')}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-14 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-none">
            {visibleTabs.map((t) => {
              const Icon   = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3.5 text-xs font-semibold
                    whitespace-nowrap border-b-2 transition-all
                    ${active
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                    }
                  `}
                >
                  <Icon className={active ? 'text-amber-400' : 'text-slate-600'} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'inicio' && (
              <SectionInicio
                clientData={portal.clientData}
                visits={portal.visits}
                contracts={portal.contracts}
                favProps={portal.favProps}
                setTab={setTab}
              />
            )}
            {tab === 'favoritos' && (
              <SectionFavoritos
                favProps={portal.favProps}
                favLoading={portal.loadingFavProps}
                onRemoveFavorite={portal.toggleFavorite}
                onToggleCompare={() => setTab('comparar')}
              />
            )}
            {tab === 'comparar' && (
              <SectionComparar favProps={portal.favProps} />
            )}
            {tab === 'visitas' && (
              <SectionVisitas
                visits={portal.visits}
                onCancelVisit={portal.cancelClientVisit}
              />
            )}
            {tab === 'contratos' && (
              <SectionContratos contracts={portal.contracts} />
            )}
            {tab === 'actividad' && (
              <SectionActividad
                clientId={portal.clientId}
                notifications={portal.notifications}
              />
            )}
            {tab === 'perfil' && (
              <SectionPerfil
                clientData={portal.clientData}
                clientId={portal.clientId}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}