import { useCallback, useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contract.service';
import { CONTRACT_STATUS } from '../types/contract.types';
import toast from 'react-hot-toast';

/**
 * useContracts — hook para la página de administración de contratos.
 *
 * Usa onSnapshot para actualización en tiempo real.
 * Expone helpers para crear, actualizar estado y eliminar.
 * Los filtros (search, type, status, agent) se aplican en memoria.
 */
export function useContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // Filtros locales
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('');
  const [filterStatus,setFilterStatus]= useState('');
  const [filterAgent, setFilterAgent] = useState('');

  useEffect(() => {
    const unsub = contractService.subscribeAll((data) => {
      setContracts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Lista filtrada en memoria — no genera lecturas Firestore extra
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

  // Agentes únicos para el filtro
  const agents = useMemo(() => {
    const names = [...new Set(contracts.map((c) => c.agentName).filter(Boolean))];
    return names.sort();
  }, [contracts]);

  // Contadores por estado
  const counts = useMemo(() =>
    contracts.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {}),
  [contracts]);

  const updateStatus = useCallback(async (id, newStatus, notes = '') => {
    try {
      await contractService.updateStatus(id, newStatus, notes);
      toast.success(`Contrato marcado como ${newStatus}`);
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
    // filtros
    search,      setSearch,
    filterType,  setFilterType,
    filterStatus,setFilterStatus,
    filterAgent, setFilterAgent,
    // acciones
    updateStatus,
    remove,
  };
}
