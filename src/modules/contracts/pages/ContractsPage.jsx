import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaFileContract, FaSearch, FaPlus, FaFilter,
  FaSpinner, FaTimes, FaExclamationTriangle,
  FaCalendarAlt, FaMoneyBillWave, FaUserTie,
} from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';
import ContractStatusBadge from '../components/ContractStatusBadge';
import ContractTypeBadge from '../components/ContractTypeBadge';
import ContractTimeline from '../components/ContractTimeline';
import ContractForm from '../components/ContractForm';
import ContractDetail from '../components/ContractDetail';
import {
  CONTRACT_STATUS, CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  CONTRACT_OPERATION_MODE_LABELS,
  CONTRACT_BUSINESS_STAGE_LABELS,
  resolveContractBusinessStage,
  getStageLabel, getOperationModeLabel,
} from '../types/contract.types';
import { formatCOP }   from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

const getStatusGeneral = (c) => c.statusGeneral || c.status;

export default function ContractsPage() {
  const {
    contracts, filtered, loading, counts, agents,
    search,        setSearch,
    filterType,    setFilterType,
    filterStatus,  setFilterStatus,
    filterAgent,   setFilterAgent,
    filterStage,   setFilterStage,
    filterOpMode,  setFilterOpMode,
  } = useContracts();

  const [showForm,     setShowForm]     = useState(false);
  const [detailItem,   setDetailItem]   = useState(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [filterExpiry, setFilterExpiry] = useState('');

  const expiringSoon = useMemo(() => contracts.filter((c) => {
    if (getStatusGeneral(c) !== CONTRACT_STATUS.ACTIVE || !c.endDate) return false;
    const d = daysUntil(c.endDate);
    return d !== null && d >= 0 && d <= 30;
  }), [contracts]);

  const expiredCount = counts[CONTRACT_STATUS.EXPIRED] ?? 0;

  const displayList = useMemo(() => {
    if (!filterExpiry) return filtered;
    return filtered.filter((c) => {
      if (!c.endDate) return false;
      const d = daysUntil(c.endDate);
      const sg = getStatusGeneral(c);
      if (filterExpiry === 'expired') return sg === CONTRACT_STATUS.EXPIRED;
      if (filterExpiry === '30') return d !== null && d >= 0 && d <= 30;
      if (filterExpiry === '60') return d !== null && d >= 0 && d <= 60;
      return true;
    });
  }, [filtered, filterExpiry]);

  const hasActiveFilters = filterType || filterStatus || filterAgent || filterExpiry || filterStage || filterOpMode;
  const clearFilters = () => {
    setFilterType(''); setFilterStatus(''); setFilterAgent('');
    setFilterExpiry(''); setFilterStage(''); setFilterOpMode('');
  };

  const totalActiveValue = useMemo(() =>
    contracts.filter((c) => getStatusGeneral(c) === CONTRACT_STATUS.ACTIVE)
             .reduce((sum, c) => sum + (Number(c.value) || 0), 0),
  [contracts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">Contratos</h1>
          <p className="text-slate-400 text-sm">Gestiona contratos de venta, arriendo y promesa</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-slate-950 font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg">
          <FaPlus size={12} /> Nuevo contrato
        </button>
      </div>

      {expiringSoon.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl cursor-pointer hover:bg-yellow-500/15 transition-colors"
          onClick={() => { setFilterExpiry('30'); setShowFilters(true); }}>
          <FaExclamationTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={14} />
          <div className="flex-1 min-w-0">
            <p className="text-yellow-300 text-sm font-semibold">
              {expiringSoon.length} contrato{expiringSoon.length > 1 ? 's' : ''} vence{expiringSoon.length === 1 ? '' : 'n'} en los próximos 30 días
            </p>
            <p className="text-yellow-500 text-xs mt-0.5 truncate">
              {expiringSoon.map((c) => c.propertyName).join(' · ')}
            </p>
          </div>
          <span className="text-yellow-400 text-xs font-semibold whitespace-nowrap">Ver →</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vigentes',    count: counts[CONTRACT_STATUS.ACTIVE] ?? 0,   color: 'text-green-400',  sub: formatCOP(totalActiveValue, true) },
          { label: 'Borradores',  count: counts[CONTRACT_STATUS.DRAFT] ?? 0,    color: 'text-slate-400',  sub: null },
          { label: 'Vencidos',    count: expiredCount,                          color: 'text-yellow-400', sub: expiringSoon.length > 0 ? `${expiringSoon.length} vencen pronto` : null },
          { label: 'Cancelados',  count: counts[CONTRACT_STATUS.CANCELLED] ?? 0, color: 'text-red-400',   sub: null },
        ].map(({ label, count, color, sub }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <p className={`text-2xl font-extrabold ${color}`}>{count}</p>
            <p className="text-slate-400 text-xs mt-0.5">{label}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
          <input type="text" placeholder="Buscar por propiedad, cliente, agente..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-colors font-semibold
            ${hasActiveFilters ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
          <FaFilter size={11} /> Filtros
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-primary text-slate-950 text-xs font-bold flex items-center justify-center">
              {[filterType, filterStatus, filterAgent, filterExpiry, filterStage, filterOpMode].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Tipo</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todos los tipos</option>
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Estado</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todos los estados</option>
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Modalidad</label>
                <select value={filterOpMode} onChange={(e) => setFilterOpMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todas las modalidades</option>
                  {Object.entries(CONTRACT_OPERATION_MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Etapa</label>
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todas las etapas</option>
                  {Object.entries(CONTRACT_BUSINESS_STAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Agente</label>
                <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Todos los agentes</option>
                  {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Vencimiento</label>
                <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none">
                  <option value="">Sin filtro</option>
                  <option value="30">⚠️ Vencen en 30 días</option>
                  <option value="60">📅 Vencen en 60 días</option>
                  <option value="expired">🔴 Ya vencidos</option>
                </select>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                  <button onClick={clearFilters}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1">
                    <FaTimes size={10} /> Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="text-sm">Cargando contratos...</p>
        </div>
      ) : displayList.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <FaFileContract size={40} className="opacity-30" />
          <p className="text-sm">No hay contratos que coincidan</p>
          {(search || hasActiveFilters) && (
            <button onClick={() => { setSearch(''); clearFilters(); }} className="text-xs text-primary hover:underline">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                {['Tipo / Propiedad', 'Cliente', 'Agente', 'Valor', 'Etapa', 'Vigencia', 'Estado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayList.map((c) => {
                const days = daysUntil(c.endDate);
                const sg = getStatusGeneral(c);
                const isExpiringSoon = sg === CONTRACT_STATUS.ACTIVE && days !== null && days >= 0 && days <= 30;
                const stage = resolveContractBusinessStage(c);
                return (
                  <motion.tr key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`hover:bg-slate-900/60 transition-colors cursor-pointer ${isExpiringSoon ? 'bg-yellow-500/5' : ''}`}
                    onClick={() => setDetailItem(c)}>
                    <td className="px-4 py-3">
                      <ContractTypeBadge type={c.type} />
                      <p className="text-slate-200 text-xs font-medium mt-1 truncate max-w-[180px]">{c.propertyName}</p>
                      {c.operationMode && (
                        <p className="text-slate-500 text-[10px] truncate max-w-[180px]">
                          {getOperationModeLabel(c.operationMode)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-xs font-medium truncate max-w-[140px]">{c.clientName}</p>
                      <p className="text-slate-500 text-xs truncate max-w-[140px]">{c.clientEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FaUserTie className="text-slate-600" size={10} />
                        <span className="text-slate-300 text-xs truncate max-w-[120px]">{c.agentName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FaMoneyBillWave className="text-slate-600" size={10} />
                        <span className="text-slate-200 text-xs font-semibold">{formatCOP(c.value)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <p className="text-emerald-400 text-xs font-semibold mb-1">{getStageLabel(stage)}</p>
                      <ContractTimeline contract={c} compact />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FaCalendarAlt className="text-slate-600" size={10} />
                        <div>
                          <p className="text-slate-400 text-xs">{formatShort(c.startDate) || '—'}</p>
                          {c.endDate && (
                            <p className={`text-xs ${isExpiringSoon ? 'text-yellow-400 font-semibold' : 'text-slate-500'}`}>
                              {isExpiringSoon ? `⚠️ ${days}d` : `hasta ${formatShort(c.endDate)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><ContractStatusBadge status={sg} /></td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDetailItem(c)} className="text-xs text-primary hover:underline">Ver</button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && displayList.length > 0 && (
        <p className="text-slate-600 text-xs text-center">
          {displayList.length} contrato{displayList.length !== 1 ? 's' : ''} mostrado{displayList.length !== 1 ? 's' : ''}
        </p>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Nuevo contrato</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <FaTimes size={14} />
                </button>
              </div>
              <ContractForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDetailItem(null); }}>
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="bg-slate-950 border-l border-slate-800 h-full w-full sm:w-[600px] overflow-y-auto p-6 flex flex-col gap-4">
              <ContractDetail contract={detailItem} onClose={() => setDetailItem(null)}
                onUpdated={(updated) => {
                  if (updated && updated.id) {
                    // Re-lectura completa del contrato (viene de getContractById)
                    setDetailItem(updated);
                  } else if (updated) {
                    setDetailItem((prev) => ({ ...prev, ...updated }));
                  } else {
                    setDetailItem(null);
                  }
                }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}