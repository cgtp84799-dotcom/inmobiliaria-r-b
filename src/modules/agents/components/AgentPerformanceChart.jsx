import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * AgentPerformanceChart — gráfica de barras dobles (visitas vs contratos)
 * por los últimos 6 meses. Implementada con SVG puro, sin dependencias externas.
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

  const H    = 160; // altura máxima de barras en px
  const barW = 14;  // ancho de cada barra
  const gap  = 6;   // espacio entre barra de visitas y contratos
  const groupW = barW * 2 + gap + 16; // ancho de cada grupo

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

      {/* SVG */}
      <svg
        viewBox={`0 0 ${monthlyData.length * groupW} ${H + 28}`}
        className="w-full overflow-visible"
        style={{ maxHeight: '200px' }}
      >
        {/* Líneas de guía horizontales */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1="0" y1={H - t * H}
            x2={monthlyData.length * groupW} y2={H - t * H}
            stroke="#1e2730" strokeWidth="1"
          />
        ))}

        {monthlyData.map((m, i) => {
          const x     = i * groupW;
          const vH    = Math.max(4, (m.visits    / maxVal) * H);
          const cH    = Math.max(4, (m.contracts / maxVal) * H);
          const vY    = H - vH;
          const cY    = H - cH;

          return (
            <g key={m.label}>
              {/* Barra visitas */}
              <motion.rect
                x={x}
                initial={{ y: H, height: 0 }}
                animate={{ y: vY, height: vH }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                width={barW}
                rx={3}
                fill="rgba(59,130,246,0.65)"
              />
              {/* Barra contratos */}
              <motion.rect
                x={x + barW + gap}
                initial={{ y: H, height: 0 }}
                animate={{ y: cY, height: cH }}
                transition={{ delay: i * 0.08 + 0.05, duration: 0.5, ease: 'easeOut' }}
                width={barW}
                rx={3}
                fill="rgba(212,168,67,0.75)"
              />
              {/* Valores encima de las barras */}
              {m.visits > 0 && (
                <text x={x + barW / 2} y={vY - 3} textAnchor="middle"
                  fontSize="8" fill="rgba(148,163,184,0.8)">{m.visits}</text>
              )}
              {m.contracts > 0 && (
                <text x={x + barW + gap + barW / 2} y={cY - 3} textAnchor="middle"
                  fontSize="8" fill="rgba(212,168,67,0.9)">{m.contracts}</text>
              )}
              {/* Etiqueta del mes */}
              <text
                x={x + barW + gap / 2}
                y={H + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                className="capitalize"
              >
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
