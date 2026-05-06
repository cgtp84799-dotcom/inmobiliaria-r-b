// src/modules/clients/components/portal/SectionInicio.jsx
// MEJORADO:
//  - Saludo con frase motivacional según hora del día
//  - KPIs clicables que llevan a la sección correspondiente
//  - Tarjeta de próxima visita más rica (con countdown visual)
//  - Preview de últimos contratos si existen
//  - Acciones rápidas (Explorar, Agendar visita, Ver contratos)
//  - Estado vacío mejorado con pasos de onboarding

import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
  FaSearch, FaArrowRight, FaMapMarkerAlt, FaClock,
  FaBolt, FaCheckCircle, FaCalendarCheck,
} from 'react-icons/fa';
import { format, differenceInDays, differenceInHours, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCOP } from '../../../../shared/utils/formatCurrency';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 18) return '¡Buenas tardes';
  return '¡Buenas noches';
}

function getMotivationalPhrase() {
  const h = new Date().getHours();
  if (h < 12) return 'Hoy puede ser el día de encontrar tu propiedad ideal.';
  if (h < 18) return 'Revisa tus visitas pendientes y da el siguiente paso.';
  return 'Una buena propiedad siempre vale la pena esperar.';
}

function Countdown({ dateStr, timeStr }) {
  if (!dateStr) return null;
  const dt = parseISO(`${dateStr}T${timeStr || '10:00'}`);
  if (!isValid(dt)) return null;

  const diffH = differenceInHours(dt, new Date());
  const diffD = differenceInDays(dt, new Date());

  if (diffH < 0) return (
    <span className="inline-flex items-center gap-1 bg-[var(--color-input-bg)]/50 text-[var(--color-text-muted)] text-xs px-2.5 py-1 rounded-full font-semibold">
      <FaClock className="text-[9px]" /> Pasada
    </span>
  );

  let label = '';
  if (diffH < 24)  label = `Hoy en ${diffH}h`;
  else if (diffD === 1) label = 'Mañana';
  else label = `En ${diffD} días`;

  const isUrgent = diffH < 24;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${
      isUrgent
        ? 'bg-red-500/15 text-red-400 border-red-500/20'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    }`}>
      <FaClock className="text-[9px]" /> {label}
    </span>
  );
}

function fmtDate(val) {
  if (!val) return '—';
  const d = typeof val === 'string' ? parseISO(val) : val?.toDate?.() ?? null;
  if (!d || !isValid(d)) return '—';
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

function resolvePrice(p) {
  const v = p.price?.sale ?? p.price?.rent ?? p.price ?? null;
  if (!v) return null;
  return formatCOP ? formatCOP(v) : `$${Number(v).toLocaleString()}`;
}

// ─── Componente de paso de onboarding ────────────────────────────────────────
function OnboardingStep({ number, title, desc, done, action }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition ${
      done
        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
        : 'bg-[var(--color-surface)]/60 border-[var(--color-border)]/60'
    }`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
        done
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]'
      }`}>
        {done ? <FaCheckCircle className="text-[10px]" /> : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${done ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>
          {title}
        </p>
        <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5">{desc}</p>
      </div>
      {!done && action && (
        <div className="flex-shrink-0">{action}</div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SectionInicio({ clientData, visits, contracts, favProps, setTab }) {
  const navigate  = useNavigate();
  const name      = clientData?.nombre || 'Cliente';
  const firstName = name.split(' ')[0];

  // Próxima visita activa
  const nextVisit = visits.find((v) => ['approved', 'pending'].includes(v.status));

  // Última visita completada
  const lastVisit = [...visits]
    .filter((v) => v.status === 'completed' || v.status === 'completada')
    .sort((a, b) => {
      const aT = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
      const bT = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
      return bT - aT;
    })[0];

  // Contrato activo más reciente
  const activeContract = contracts.find((c) => c.status === 'vigente');

  const favCount       = (clientData?.favorites ?? []).length;
  const hasActivity    = visits.length > 0 || contracts.length > 0;

  // KPIs
  const kpis = [
    {
      label:    'Favoritos',
      value:    favCount,
      icon:     FaHeart,
      color:    'text-rose-400',
      bg:       'bg-rose-500/10',
      border:   'border-rose-500/20',
      tab:      'favoritos',
      show:     true,
    },
    {
      label:    'Visitas',
      value:    visits.length,
      icon:     FaCalendarAlt,
      color:    'text-blue-400',
      bg:       'bg-blue-500/10',
      border:   'border-blue-500/20',
      tab:      'visitas',
      show:     visits.length > 0,
    },
    {
      label:    'Contratos',
      value:    contracts.length,
      icon:     FaFileContract,
      color:    'text-emerald-400',
      bg:       'bg-emerald-500/10',
      border:   'border-emerald-500/20',
      tab:      'contratos',
      show:     contracts.length > 0,
    },
  ].filter((k) => k.show);

  // Acciones rápidas
  const quickActions = [
    {
      label:   'Explorar catálogo',
      icon:    FaSearch,
      color:   'text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50',
      action:  () => navigate('/catalogo'),
    },
    {
      label:   'Agendar visita',
      icon:    FaCalendarCheck,
      color:   'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50',
      action:  () => navigate('/agendar-visita'),
    },
    ...(contracts.length > 0 ? [{
      label:   'Mis contratos',
      icon:    FaFileContract,
      color:   'text-purple-400 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50',
      action:  () => setTab('contratos'),
    }] : []),
    ...(favProps.length >= 2 ? [{
      label:   'Comparar',
      icon:    FaBolt,
      color:   'text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50',
      action:  () => setTab('comparar'),
    }] : []),
  ];

  return (
    <div className="space-y-6">

      {/* ─── Saludo ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)]">
          {getGreeting()},{' '}
          <span className="text-amber-400">{firstName}</span>! 👋
        </h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
        {hasActivity && (
          <p className="text-[var(--color-text-muted)] text-xs mt-1 italic">{getMotivationalPhrase()}</p>
        )}
      </div>

      {/* ─── KPIs clicables ─────────────────────────────────────────────────── */}
      {kpis.length > 0 && (
        <div className={`grid gap-3 ${
          kpis.length === 3 ? 'grid-cols-3' :
          kpis.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
        }`}>
          {kpis.map((k) => (
            <motion.button
              key={k.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(k.tab)}
              className={`${k.bg} border ${k.border} rounded-2xl p-4 text-center cursor-pointer transition hover:opacity-90`}
            >
              <k.icon className={`${k.color} text-lg mx-auto mb-1.5`} />
              <p className="text-2xl font-bold text-[var(--color-text)] leading-none">{k.value}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{k.label}</p>
            </motion.button>
          ))}
        </div>
      )}

      {/* ─── Próxima visita ──────────────────────────────────────────────────── */}
      {nextVisit && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-slate-900/40 border border-amber-500/20 rounded-2xl p-5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <FaCalendarAlt className="text-[10px]" /> Próxima visita
              </span>
              <Countdown dateStr={nextVisit.requestedDate} timeStr={nextVisit.requestedTime} />
            </div>
            <p className="text-[var(--color-text)] font-semibold">{nextVisit.propertyName || 'Propiedad'}</p>
            {nextVisit.propertyAddress && (
              <p className="text-[var(--color-text-muted)] text-sm mt-0.5 flex items-center gap-1">
                <FaMapMarkerAlt className="text-[10px]" /> {nextVisit.propertyAddress}
              </p>
            )}
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              {fmtDate(nextVisit.requestedDate)}
              {nextVisit.requestedTime && ` · ${nextVisit.requestedTime}`}
            </p>
            {nextVisit.status === 'pending' && (
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-semibold">
                Pendiente de confirmación
              </span>
            )}
            {nextVisit.status === 'approved' && (
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                ✓ Confirmada
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Contrato activo ─────────────────────────────────────────────────── */}
      {activeContract && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FaFileContract className="text-[10px]" /> Contrato vigente
            </span>
            <button
              onClick={() => setTab('contratos')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Ver <FaArrowRight className="text-[9px]" />
            </button>
          </div>
          <p className="text-[var(--color-text)] text-sm font-semibold">{activeContract.propertyName || 'Propiedad'}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)] flex-wrap">
            <span className="capitalize">{activeContract.type}</span>
            {activeContract.value > 0 && (
              <span className="text-amber-400 font-semibold">{formatCOP ? formatCOP(activeContract.value) : `$${activeContract.value.toLocaleString()}`}</span>
            )}
            {activeContract.endDate && (
              <span>· Hasta {fmtDate(activeContract.endDate)}</span>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Favoritos preview ───────────────────────────────────────────────── */}
      {favProps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <FaHeart className="text-rose-400 text-xs" /> Tus favoritos
            </h3>
            <button
              onClick={() => setTab('favoritos')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
            >
              Ver todos <FaArrowRight className="text-[10px]" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {favProps.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/propiedades/${p.slug || p.id}`}
                className="group bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 rounded-xl overflow-hidden hover:border-amber-500/30 transition"
              >
                <div className="h-24 bg-[var(--color-surface)] overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaHome className="text-[var(--color-text-faint)] text-xl" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[var(--color-text)] text-xs font-semibold truncate">{p.title}</p>
                  <p className="text-amber-400 text-xs font-bold mt-0.5">{resolvePrice(p) || '—'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── Acciones rápidas ────────────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide text-xs">
            Acciones rápidas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={a.action}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${a.color}`}
              >
                <a.icon className="text-base" />
                <span className="text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Última visita realizada ─────────────────────────────────────────── */}
      {lastVisit && !nextVisit && (
        <div className="p-4 bg-[var(--color-surface)]/40 border border-[var(--color-border)]/40 rounded-2xl">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Última visita</p>
          <p className="text-[var(--color-text)] text-sm font-semibold">{lastVisit.propertyName || 'Propiedad'}</p>
          <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{fmtDate(lastVisit.requestedDate)}</p>
          <button
            onClick={() => setTab('visitas')}
            className="mt-2 text-xs text-amber-400 hover:underline flex items-center gap-1"
          >
            Ver historial <FaArrowRight className="text-[9px]" />
          </button>
        </div>
      )}

      {/* ─── Onboarding / Estado vacío ───────────────────────────────────────── */}
      {!nextVisit && favProps.length === 0 && contracts.length === 0 && (
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <FaHome className="text-amber-400 text-xl" />
            </div>
            <h3 className="text-[var(--color-text)] font-semibold mb-1">¡Bienvenido a tu portal!</h3>
            <p className="text-[var(--color-text-muted)] text-sm max-w-xs mx-auto">
              Sigue estos pasos para comenzar tu experiencia.
            </p>
          </div>

          <div className="space-y-2">
            <OnboardingStep
              number="1"
              title="Explora el catálogo de propiedades"
              desc="Navega entre casas, apartamentos, lotes y fincas disponibles."
              done={false}
              action={
                <Link
                  to="/catalogo"
                  className="text-xs font-semibold text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg hover:bg-amber-500/10 transition whitespace-nowrap"
                >
                  Explorar →
                </Link>
              }
            />
            <OnboardingStep
              number="2"
              title="Guarda tus favoritos"
              desc="Dale ❤️ a las propiedades que más te gusten para compararlas luego."
              done={favCount > 0}
              action={null}
            />
            <OnboardingStep
              number="3"
              title="Agenda una visita"
              desc="Solicita una cita para conocer personalmente la propiedad."
              done={visits.length > 0}
              action={
                visits.length === 0 ? (
                  <Link
                    to="/agendar-visita"
                    className="text-xs font-semibold text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/10 transition whitespace-nowrap"
                  >
                    Agendar →
                  </Link>
                ) : null
              }
            />
          </div>
        </div>
      )}

    </div>
  );
}