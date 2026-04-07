import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * AgentPerformanceChart — gráfica de barras dobles (visitas vs contratos)
 * por los últimos 6 meses. SVG puro, sin dependencias externas.
 */
export default function AgentPerformanceChart({ monthlyData = [], loading = false }) {
  const maxVal = useMemo(
    () => Math.max(...monthlyData.flatMap((m) => [m.visits, m.contracts]), 1),
    [monthlyData],
  );

  if (loading) {
    return (
      <div className="h-48 flex items-end gap-3 px-2 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 items-center">
            <div className="w-full bg-slate-800 rounded-t" style={{ height: `${30 + i * 12}px` }} />
            <div className="w-8 h-2 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!monthlyData.length) return null;

  const H = 140;
  const barW = 14;
  const gap  = 5;
  const groupW = barW * 2 + gap + 18;

  return (
    <div className="w-full">
      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-sm bg-blue-500/70 inline-block" /> Visitas
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-sm bg-primary/70 inline-block" /> Contratos
        </span>
      </div>

      <svg
        viewBox={`0 0 ${monthlyData.length * groupW} ${H + 28}`}
        className="w-full overflow-visible"
        style={{ maxHeight: '180px' }}
      >
        {/* Líneas guía */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1="0" y1={H - t * H}
            x2={monthlyData.length * groupW} y2={H - t * H}
            stroke="#1e2730" strokeWidth="1"
          />
        ))}

        {monthlyData.map((m, i) => {
          const x  = i * groupW;
          const vH = Math.max(3, (m.visits    / maxVal) * H);
          const cH = Math.max(3, (m.contracts / maxVal) * H);

          return (
            <g key={m.label}>
              <motion.rect
                x={x} width={barW} rx={3}
                fill="rgba(59,130,246,0.65)"
                initial={{ y: H, height: 0 }}
                animate={{ y: H - vH, height: vH }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
              />
              <motion.rect
                x={x + barW + gap} width={barW} rx={3}
                fill="rgba(212,168,67,0.75)"
                initial={{ y: H, height: 0 }}
                animate={{ y: H - cH, height: cH }}
                transition={{ delay: i * 0.08 + 0.05, duration: 0.5, ease: 'easeOut' }}
              />
              {m.visits > 0 && (
                <text x={x + barW / 2} y={H - vH - 3}
                  textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.8)">{m.visits}</text>
              )}
              {m.contracts > 0 && (
                <text x={x + barW + gap + barW / 2} y={H - cH - 3}
                  textAnchor="middle" fontSize="8" fill="rgba(212,168,67,0.9)">{m.contracts}</text>
              )}
              <text
                x={x + barW + gap / 2} y={H + 16}
                textAnchor="middle" fontSize="9" fill="#64748b"
                className="capitalize"
              >{m.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
