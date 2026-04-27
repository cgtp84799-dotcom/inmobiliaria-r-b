// src/modules/agents/components/AgentVisitRow.jsx
//
// ★ FIX (auditoría):
//   - `scheduledAt` no existe — el campo real es `requestedDate` + `requestedTime`.
//   - `confirmed` no es status real → es `approved`.
//   - `cancelled` puede venir como `cancelada` (cliente cancela desde portal).
//   - `propertyTitle` no existe → usar `propertyName` o `propertyAddress`.
import { FaClock, FaHome, FaUser, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';

const STATUS_CFG = {
  pending:     { icon: FaHourglassHalf, color: 'yellow-400', label: 'Pendiente'  },
  approved:    { icon: FaClock,         color: 'blue-400',   label: 'Aprobada'   },
  rescheduled: { icon: FaClock,         color: 'blue-400',   label: 'Reagendada' },
  completed:   { icon: FaCheckCircle,   color: 'green-400',  label: 'Completada' },
  completada:  { icon: FaCheckCircle,   color: 'green-400',  label: 'Completada' },
  rejected:    { icon: FaTimesCircle,   color: 'red-400',    label: 'Rechazada'  },
  cancelled:   { icon: FaTimesCircle,   color: 'red-400',    label: 'Cancelada'  },
  cancelada:   { icon: FaTimesCircle,   color: 'red-400',    label: 'Cancelada'  },
};

const fmtRequested = (visit) => {
  if (!visit) return '--';
  const date = visit.requestedDate || '';
  const time = visit.requestedTime || '';
  if (!date && !time) return '--';
  if (!time) return date;
  return time;
};

const AgentVisitRow = ({ visit }) => {
  const cfg = STATUS_CFG[visit.status] || STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className={`w-8 h-8 rounded-lg bg-${cfg.color}/10 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`text-${cfg.color} text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-light font-medium truncate">
          {visit.propertyName || visit.propertyAddress || 'Propiedad sin título'}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <FaUser className="text-slate-500" />
            {visit.clientName || 'Cliente'}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <FaClock className="text-slate-500" />
            {fmtRequested(visit)}
          </span>
        </div>
      </div>
      <span className={`text-xs font-semibold text-${cfg.color} bg-${cfg.color}/10 px-2 py-0.5 rounded-full flex-shrink-0`}>
        {cfg.label}
      </span>
    </div>
  );
};

export default AgentVisitRow;