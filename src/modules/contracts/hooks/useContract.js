import { useCallback, useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contract.service';
import { CONTRACT_STATUS } from '../types/contract.types';
import toast from 'react-hot-toast';

/**
 * useContracts — hook para ContractsPage.
 *
 * Usa onSnapshot para tiempo real.
 * Expone filtros en memoria (sin queries extra a Firestore).
 * Agrega totalActiveValue y expiringSoonCount para el dashboard.
 */
export function useContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgent,  setFilterAgent]  = useState('');

  useEffect(() => {
    const unsub = contractService.subscribeAll((data) => {
      setContracts(data);
      setLoading(false);
      setError(null);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = [...contracts];
    if (filterType)   list = list.filter((c) => c.type   === filterType);
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    if (filterAgent)  list = list.filter((c) => c.agentName === filterAgent);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.propertyName?.toLowerCase().includes(q)  ||
        c.clientName?.toLowerCase().includes(q)    ||
        c.clientEmail?.toLowerCase().includes(q)   ||
        c.agentName?.toLowerCase().includes(q)     ||
        c.propertyAddress?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contracts, filterType, filterStatus, filterAgent, search]);

  const agents = useMemo(() => {
    const names = [...new Set(contracts.map((c) => c.agentName).filter(Boolean))];
    return names.sort();
  }, [contracts]);

  const counts = useMemo(() =>
    contracts.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {}),
  [contracts]);

  // Valor total de contratos vigentes
  const totalActiveValue = useMemo(() =>
    contracts
      .filter((c) => c.status === CONTRACT_STATUS.ACTIVE)
      .reduce((sum, c) => sum + (Number(c.value) || 0), 0),
  [contracts]);

  // Contratos que vencen en los próximos 30 días
  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    return contracts.filter((c) => {
      if (c.status !== CONTRACT_STATUS.ACTIVE || !c.endDate) return false;
      const diff = new Date(c.endDate) - now;
      return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;
  }, [contracts]);

  const updateStatus = useCallback(async (id, newStatus, notes = '') => {
    try {
      await contractService.updateStatus(id, newStatus, notes);
      toast.success(`Estado actualizado: ${newStatus}`);
    } catch {
      toast.error('Error al actualizar el estado');
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await contractService.deleteContract(id);
      toast.success('Contrato eliminado');
    } catch {
      toast.error('Error al eliminar el contrato');
    }
  }, []);

  return {
    contracts,
    filtered,
    loading,
    error,
    counts,
    agents,
    totalActiveValue,
    expiringSoonCount,
    search,       setSearch,
    filterType,   setFilterType,
    filterStatus, setFilterStatus,
    filterAgent,  setFilterAgent,
    updateStatus,
    remove,
  };
}