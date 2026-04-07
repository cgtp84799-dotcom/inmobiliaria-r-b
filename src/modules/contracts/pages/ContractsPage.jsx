import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaFileContract, FaSearch, FaPlus, FaFilter,
  FaSpinner, FaTimes,
} from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';
import ContractStatusBadge from '../components/ContractStatusBadge';
import ContractTypeBadge from '../components/ContractTypeBadge';
import ContractForm from '../components/ContractForm';
import ContractDetail from '../components/ContractDetail';
import {
  CONTRACT_STATUS, CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE,   CONTRACT_TYPE_LABELS,
} from '../types/contract.types';
import { formatCOP }   from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';

/**
 * ContractsPage — panel de administración de contratos.
 *
 * Ruta: /contratos  (solo admin / member)
 *
 * Incluye:
 *  - Tabla responsive con datos clave
 *  - Filtros por tipo, estado y agente
 *  - Buscador en tiempo real (memoria)
 *  - Drawer lateral para detalle
 *  - Modal para crear contrato (ContractForm stepper)
 */
export default function ContractsPage() {
  const {
    filtered, loading, counts, agents,
    search, setSearch,
    filterType,   setFilterType,
    filterStatus, setFilterStatus,
    filterAgent,  setFilterAgent,
    updateStatus, remove,
  } = useContracts();

  const [showForm,    setShowForm]    = useState(false);
  const [detailItem,  setDetailItem]  = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filterType || filterStatus || filterAgent;

  const clearFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterAgent('');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            Contratos
          </h1>
          <p className="text-slate-400 text-sm">
            Gestiona contratos de venta, arriendo y promesa
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-primary text-slate-950 font-semibold text-sm
            hover:bg-primary/90 transition-colors shadow-lg"
        >
          <FaPlus size={12} /> Nuevo contrato
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vigentes',   count: counts[CONTRACT_STATUS.ACTIVE]    ?? 0, color: 'text-green-400'  },
          { label: 'Borradores', count: counts[CONTRACT_STATUS.DRAFT]     ?? 0, color: 'text-slate-400'  },
          { label: 'Vencidos',   count: counts[CONTRACT_STATUS.EXPIRED]   ?? 0, color: 'text-yellow-400' },
          { label: 'Cancelados', count: counts[CONTRACT_STATUS.CANCELLED] ?? 0, color: 'text-red-400'    },
        ].map(({ label, count, color }) => (
          <div key={label}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{count}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Barra de búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
          <input
            type="text"
            placeholder="Buscar por propiedad, cliente, agente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl
              pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
              focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
            border transition-colors font-semibold
            ${ hasActiveFilters
              ? 'bg-primary/20 border-primary/50 text-primary'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
        >
          <FaFilter size={11} />
          Filtros
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-primary text-slate-950 text-xs
              font-bold flex items-center justify-center">
              {[filterType, filterStatus, filterAgent].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Panel de filtros expandible */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4
              bg-slate-900/60 border border-slate-800 rounded-2xl">
              {/* Tipo */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Tipo</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2
                    text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todos los tipos</option>
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {/* Estado */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Estado</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2
                    text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todos los estados</option>
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {/* Agente */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Agente</label>
                <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2
                    text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todos los agentes</option>
                  {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-3 flex justify-end">
                  <button onClick={clearFilters}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors
                      flex items-center gap-1">
                    <FaTimes size={10} /> Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla / lista */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="text-sm">Cargando contratos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <FaFileContract size={40} className="opacity-30" />
          <p className="text-sm">No hay contratos que coincidan</p>
          {(search || hasActiveFilters) && (
            <button onClick={() => { setSearch(''); clearFilters(); }}
              className="text-xs text-primary hover:underline">Limpiar búsqueda</button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                {['Tipo / Propiedad', 'Cliente', 'Agente', 'Valor', 'Inicio', 'Estado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                    text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((c) => (
                <motion.tr
                  key={c.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  onClick={() => setDetailItem(c)}
                >
                  {/* Tipo + Propiedad */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <ContractTypeBadge type={c.type} />
                    </div>
                    <p className="text-slate-200 text-xs font-medium mt-1 truncate max-w-[180px]">
                      {c.propertyName}
                    </p>
                    {c.propertyAddress && (
                      <p className="text-slate-500 text-xs truncate max-w-[180px]">{c.propertyAddress}</p>
                    )}
                  </td>
                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <p className="text-slate-200 text-xs font-medium truncate max-w-[140px]">{c.clientName}</p>
                    <p className="text-slate-500 text-xs truncate max-w-[140px]">{c.clientEmail}</p>
                  </td>
                  {/* Agente */}
                  <td className="px-4 py-3">
                    <p className="text-slate-300 text-xs truncate max-w-[120px]">{c.agentName || '—'}</p>
                  </td>
                  {/* Valor */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-slate-200 text-xs font-semibold">{formatCOP(c.value)}</p>
                  </td>
                  {/* Inicio */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-slate-400 text-xs">{formatShort(c.startDate) || '—'}</p>
                  </td>
                  {/* Estado */}
                  <td className="px-4 py-3">
                    <ContractStatusBadge status={c.status} />
                  </td>
                  {/* Acción rápida */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailItem(c)}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie de tabla */}
      {!loading && filtered.length > 0 && (
        <p className="text-slate-600 text-xs text-center">
          {filtered.length} contrato{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Modal Nuevo Contrato ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center
              bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{   opacity: 0, scale: 0.95,  y: 20 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl
                p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Nuevo contrato</h2>
                <button onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400
                    hover:text-white transition-colors">
                  <FaTimes size={14} />
                </button>
              </div>
              <ContractForm
                onSuccess={(id) => {
                  setShowForm(false);
                }}
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drawer / Panel de detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-end
              bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDetailItem(null); }}
          >
            <motion.div
              initial={{ opacity: 0, x: 40  }}
              animate={{ opacity: 1, x: 0   }}
              exit={{   opacity: 0, x: 40   }}
              className="bg-slate-950 border-l border-slate-800 h-full w-full sm:w-[420px]
                overflow-y-auto p-6 flex flex-col gap-4"
            >
              <ContractDetail
                contract={detailItem}
                onClose={() => setDetailItem(null)}
                onUpdated={() => setDetailItem(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
