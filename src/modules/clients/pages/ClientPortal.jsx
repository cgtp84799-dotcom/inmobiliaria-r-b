// src/modules/clients/pages/ClientPortal.jsx
// ─────────────────────────────────────────────────────────────
// Portal del cliente — rediseño editorial
// · Respeta el tema global (light/dark) — NO fuerza dark
// · Tokens CSS semánticos en todo el chrome
// · Wrap en .portal-client para scope de overrides
// · Tabs con pill indicator, navbar con Fraunces
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
  FaUser, FaSignOutAlt, FaSpinner, FaChevronDown,
  FaHistory, FaBalanceScale, FaArrowLeft,
} from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
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

/* ─── User menu ──────────────────────────────────────────── */
function UserMenu({ name, photo, onProfile, onSignOut }) {
  const [open, setOpen] = useState(false);
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="portal-user-btn"
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        {photo ? (
          <img src={photo} alt={name} className="portal-user-avatar" />
        ) : (
          <span className="portal-user-avatar portal-user-avatar--initials">
            {initials}
          </span>
        )}
        <span className="portal-user-name">{name.split(' ')[0]}</span>
        <FaChevronDown className={`portal-user-chevron ${open ? 'is-open' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="portal-user-menu"
              role="menu"
            >
              <button
                onClick={() => { setOpen(false); onProfile(); }}
                className="portal-user-menu__item"
                role="menuitem"
              >
                <FaUser className="portal-user-menu__icon" /> Mi perfil
              </button>
              <div className="portal-user-menu__divider" />
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="portal-user-menu__item portal-user-menu__item--danger"
                role="menuitem"
              >
                <FaSignOutAlt className="portal-user-menu__icon" /> Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────── */
export default function ClientPortal() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('inicio');

  // ★ FIX (auditoría): si admin/agente entra equivocadamente al portal cliente
  // (URL /portal), redirigir a su dashboard. Antes el portal montaba todos los
  // hooks → resolveClientByEmail creaba un /clients fantasma.
  useEffect(() => {
    if (!currentUser) return;
    const role = userData?.role;
    if (role === 'admin' || role === 'member') {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, userData?.role, navigate]);

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

  function handleModalDone() {
    // ★ FIX (auditoría): WelcomeModal.handleFinish/handleSkip ya marcan
    // onboardingDone:true en el doc real (con dedup). Llamar finishOnboarding
    // aquí escribiría DE NUEVO sobre el clientId (que puede ser stale si hubo
    // dedup en el camino). Solo cerramos el modal.
    dismissWelcome();
  }

  const displayName = portal.clientData?.nombre
    || userData?.displayName
    || currentUser?.displayName
    || currentUser?.email?.split('@')[0]
    || 'Cliente';
  const photoURL = currentUser?.photoURL || userData?.photoURL || null;

  if (portal.loading) {
    return (
      <div className="portal-client portal-loading">
        <div className="text-center">
          <FaSpinner className="portal-loading__spinner" />
          <p className="portal-loading__text">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-client">
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal
            clientId={portal.clientId}
            clientData={portal.clientData}
            onDone={handleModalDone}
          />
        )}
      </AnimatePresence>

      {/* ═══ NAVBAR ═══ */}
      <header className="portal-navbar">
        <div className="portal-navbar__inner">
          <Link to="/catalogo" className="portal-navbar__brand">
            <FaArrowLeft className="portal-navbar__brand-icon" />
            <div className="portal-navbar__brand-text">
              <span className="portal-navbar__brand-back">Volver al sitio</span>
              <span className="portal-navbar__brand-name">Mi portal</span>
            </div>
          </Link>

          <div className="portal-navbar__actions">
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

      {/* ═══ TABS ═══ */}
      <nav className="portal-tabs" aria-label="Secciones del portal">
        <div className="portal-tabs__inner">
          <div className="portal-tabs__scroll">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`portal-tab ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="portal-tab__icon" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ═══ CONTENIDO ═══ */}
      <main className="portal-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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