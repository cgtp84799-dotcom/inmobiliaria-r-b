// src/modules/visits/pages/CalendarPage.jsx

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronLeft, FaChevronRight, FaCalendarAlt,
  FaGlobe, FaBuilding, FaUserTie, FaClock,
} from 'react-icons/fa';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function CalendarPage() {
  const { events, loading } = useCalendarEvents();
  const [view,     setView]     = useState('month'); // 'month' | 'week'
  const [cursor,   setCursor]   = useState(new Date());
  const [selected, setSelected] = useState(null);

  // Agrupar eventos por fecha
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!e.date) return;
      (map[e.date] = map[e.date] || []).push(e);
    });
    return map;
  }, [events]);

  // ── Vista mensual ────────────────────────────────────────────
  const monthCells = useMemo(() => {
    const year  = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
    return cells;
  }, [cursor]);

  // ── Vista semanal ────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const base = new Date(cursor);
    const day  = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    base.setDate(base.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = toKey(new Date());

  const navigate = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  };

  const title = view === 'month'
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : (() => {
        const s = weekDays[0]; const e = weekDays[6];
        return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
      })();

  // ── Celda de día ─────────────────────────────────────────────
  const DayCell = ({ date, mini = false }) => {
    if (!date) return <div className={mini ? 'h-16' : 'h-24 sm:h-28'} />;
    const key    = toKey(date);
    const dayEvs = eventsByDate[key] || [];
    const isToday = key === today;

    return (
      <div
        className={`${mini ? 'h-16' : 'h-24 sm:h-28'} rounded-xl p-1.5 border transition-colors`}
        style={isToday
          ? {
              borderColor: 'color-mix(in oklch, var(--color-primary) 50%, transparent)',
              backgroundColor: 'color-mix(in oklch, var(--color-primary) 8%, transparent)',
            }
          : {
              borderColor: 'var(--color-border)',
              backgroundColor: 'color-mix(in oklch, var(--color-surface-offset) 40%, transparent)',
            }
        }
        onMouseEnter={e => {
          if (!isToday) e.currentTarget.style.backgroundColor =
            'color-mix(in oklch, var(--color-surface-offset) 70%, transparent)';
        }}
        onMouseLeave={e => {
          if (!isToday) e.currentTarget.style.backgroundColor =
            'color-mix(in oklch, var(--color-surface-offset) 40%, transparent)';
        }}
      >
        <span
          className="text-xs font-bold"
          style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
        >
          {date.getDate()}
        </span>

        <div className="mt-1 space-y-0.5 overflow-hidden">
          {dayEvs.slice(0, mini ? 1 : 3).map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelected(ev)}
              className="w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate transition-opacity hover:opacity-80"
              style={{
                backgroundColor: ev.color + '33',
                color: ev.color,
                border: `1px solid ${ev.color}55`,
              }}
            >
              {ev.time ? `${ev.time} ` : ''}{ev.clientName || ev.title}
            </button>
          ))}
          {dayEvs.length > 3 && (
            <p className="text-[10px] px-1" style={{ color: 'var(--color-text-faint)' }}>
              +{dayEvs.length - 3} más
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>
            Calendario de Visitas
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {events.length} evento{events.length !== 1 ? 's' : ''} programados
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Toggle mes / semana */}
          <div
            className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {['month', 'week'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-1.5 text-xs font-semibold transition-colors"
                style={view === v
                  ? { background: 'var(--color-primary)', color: 'var(--color-bg)' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-muted)' }
                }
                onMouseEnter={e => { if (view !== v) e.currentTarget.style.color = 'var(--color-text)'; }}
                onMouseLeave={e => { if (view !== v) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                {v === 'month' ? 'Mes' : 'Semana'}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => navigate(-1)}>
              <FaChevronLeft size={12} />
            </NavBtn>

            <span
              className="text-sm font-bold min-w-[160px] text-center"
              style={{ color: 'var(--color-text)' }}
            >
              {title}
            </span>

            <NavBtn onClick={() => navigate(1)}>
              <FaChevronRight size={12} />
            </NavBtn>

            <NavBtn onClick={() => setCursor(new Date())} className="px-3 py-1.5 text-xs">
              Hoy
            </NavBtn>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : (
        <>
          {/* Vista mensual */}
          {view === 'month' && (
            <div
              className="rounded-2xl overflow-hidden border"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Cabecera días */}
              <div
                className="grid grid-cols-7 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-bold py-2"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Celdas */}
              <div className="grid grid-cols-7 gap-1 p-2">
                {monthCells.map((date, i) => <DayCell key={i} date={date} />)}
              </div>
            </div>
          )}

          {/* Vista semanal */}
          {view === 'week' && (
            <div
              className="rounded-2xl overflow-hidden border"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="grid grid-cols-7 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {weekDays.map((d, i) => (
                  <div
                    key={i}
                    className="text-center py-2 text-xs font-bold"
                    style={{
                      color: toKey(d) === today
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    <div>{DAYS[d.getDay()]}</div>
                    <div className="text-base">{d.getDate()}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 p-2">
                {weekDays.map((d, i) => <DayCell key={i} date={d} mini />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal evento ───────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="w-full max-w-sm rounded-2xl border p-6 space-y-4 pointer-events-auto"
                style={{
                  background: 'var(--color-surface-2)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {/* Cabecera del modal */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {selected.source === 'visits'
                        ? <FaGlobe className="text-blue-400" size={12} />
                        : <FaBuilding className="text-yellow-400" size={12} />}
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--color-text-faint)' }}
                      >
                        {selected.source === 'visits' ? 'Formulario web' : 'CRM interno'}
                      </span>
                    </div>
                    <h3
                      className="font-extrabold text-base"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {selected.propertyName || selected.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                {/* Filas de info */}
                <div className="space-y-2">
                  <InfoRow icon={<FaCalendarAlt size={11} />} label="Fecha"   value={selected.date} />
                  <InfoRow icon={<FaClock       size={11} />} label="Hora"    value={selected.time || '—'} />
                  <InfoRow icon={<FaUserTie     size={11} />} label="Cliente" value={selected.clientName || '—'} />
                  {selected.agentName && (
                    <InfoRow icon={<FaUserTie size={11} />} label="Agente" value={selected.agentName} accent />
                  )}
                </div>

                {/* Barra de color del evento */}
                <div
                  className="w-full h-1 rounded-full"
                  style={{ backgroundColor: selected.color }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Botón de navegación reutilizable ─────────────────────────────────────────
function NavBtn({ onClick, children, className = 'p-2' }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border text-xs font-semibold transition-colors ${className}`}
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-muted)',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
    >
      {children}
    </button>
  );
}

// ── Fila de información del modal ─────────────────────────────────────────────
function InfoRow({ icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--color-text-faint)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
      <span
        className={`text-xs font-semibold ${accent ? 'text-yellow-400' : ''}`}
        style={accent ? {} : { color: 'var(--color-text)' }}
      >
        {value}
      </span>
    </div>
  );
}