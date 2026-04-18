// src/modules/contracts/hooks/useContracts.js
//
// Hook para la página de administración de contratos.
// - usa statusGeneral como estado principal (con fallback a status legacy)
// - permite filtrar por businessStage y operationMode
// - counts agrupados por status y por businessStage
// - acciones: updateStatus, updateBusinessStage, remove

import { useCallback, useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contract.service';
import {
  CONTRACT_STATUS,
  resolveContractBusinessStage,
  getStatusLabel,
} from '../types/contract.types';
import toast from 'react-hot-toast';

const getStatusGeneral = (c) => c.statusGeneral || c.status;

export function useContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // Filtros
  const [search,         setSearch]         = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterAgent,    setFilterAgent]    = useState('');
  const [filterStage,    setFilterStage]    = useState('');
  const [filterOpMode,   setFilterOpMode]   = useState('');

  useEffect(() => {
    const unsub = contractService.subscribeAll((data) => {
      setContracts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = [...contracts];
    if (filterType)   list = list.filter((c) => c.type === filterType);
    if (filterStatus) list = list.filter((c) => getStatusGeneral(c) === filterStatus);
    if (filterAgent)  list = list.filter((c) => c.agentName === filterAgent);
    if (filterOpMode) list = list.filter((c) => c.operationMode === filterOpMode);
    if (filterStage)  list = list.filter((c) => resolveContractBusinessStage(c) === filterStage);
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
  }, [contracts, filterType, filterStatus, filterAgent, filterStage, filterOpMode, search]);

  const agents = useMemo(() => {
    const names = [...new Set(contracts.map((c) => c.agentName).filter(Boolean))];
    return names.sort();
  }, [contracts]);

  // Counts por statusGeneral
  const counts = useMemo(() =>
    contracts.reduce((acc, c) => {
      const s = getStatusGeneral(c);
      return { ...acc, [s]: (acc[s] ?? 0) + 1 };
    }, {}),
  [contracts]);

  // Counts por businessStage (para vista de pipeline)
  const stageCounts = useMemo(() =>
    contracts.reduce((acc, c) => {
      const s = resolveContractBusinessStage(c);
      return { ...acc, [s]: (acc[s] ?? 0) + 1 };
    }, {}),
  [contracts]);

  const updateStatus = useCallback(async (id, newStatus, notes = '', actorEmail = '') => {
    try {
      await contractService.updateStatus(id, newStatus, notes, actorEmail);
      toast.success(`Estado: ${getStatusLabel(newStatus)}`);
    } catch (e) {
      console.error('[useContracts.updateStatus]', e);
      toast.error('Error al actualizar el estado');
    }
  }, []);

  const updateBusinessStage = useCallback(async (id, newStage, opts = {}) => {
    try {
      await contractService.updateBusinessStage(id, newStage, opts);
      toast.success('Etapa actualizada');
    } catch (e) {
      console.error('[useContracts.updateBusinessStage]', e);
      toast.error('Error al actualizar la etapa');
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await contractService.deleteContract(id);
      toast.success('Contrato eliminado');
    } catch (e) {
      console.error('[useContracts.remove]', e);
      toast.error('Error al eliminar el contrato');
    }
  }, []);

  return {
    contracts, filtered, loading, error,
    counts, stageCounts, agents,
    // filtros
    search,        setSearch,
    filterType,    setFilterType,
    filterStatus,  setFilterStatus,
    filterAgent,   setFilterAgent,
    filterStage,   setFilterStage,
    filterOpMode,  setFilterOpMode,
    // acciones
    updateStatus, updateBusinessStage, remove,
  };
}