// src/shared/hooks/usePaginatedQuery.js
// ═════════════════════════════════════════════════════════════════════════════
// Hook de paginación para queries de Firestore
// Optimizado para cargar datos en páginas en lugar de todo a la vez
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { getDocs, query, orderBy, limit, startAfter, collection } from 'firebase/firestore';
import { db } from '../../core/config/firebase.config';

/**
 * Hook para paginación de queries de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {object} options - Opciones de configuración
 * @param {number} options.pageSize - Tamaño de página (default: 20)
 * @param {string} options.orderByField - Campo para ordenar (default: 'createdAt')
 * @param {string} options.orderDirection - Dirección 'desc' | 'asc' (default: 'desc')
 * @param {function} options.filterFn - Función adicional para filtrar resultados
 * @returns {object} - { data, loading, error, loadMore, hasMore, refresh }
 */
export function usePaginatedQuery(collectionName, options = {}) {
  const {
    pageSize = 20,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    filterFn = null,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (lastDocument = null, isRefresh = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
        setData([]);
        setLastDoc(null);
        setHasMore(true);
      } else if (lastDocument === null && data.length > 0) {
        // No hay más datos que cargar
        return;
      }

      const constraints = [
        orderBy(orderByField, orderDirection),
        limit(pageSize),
      ];

      if (lastDocument) {
        constraints.push(startAfter(lastDocument));
      }

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      const newDocs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Aplicar filtro adicional si existe
      const filteredDocs = filterFn 
        ? newDocs.filter(filterFn) 
        : newDocs;

      if (isRefresh || lastDocument === null) {
        setData(filteredDocs);
      } else {
        setData((prev) => [...prev, ...filteredDocs]);
      }

      // Determinar si hay más datos
      setHasMore(filteredDocs.length === pageSize);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setError(null);
    } catch (err) {
      console.error(`[usePaginatedQuery] Error fetching ${collectionName}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collectionName, pageSize, orderByField, orderDirection, filterFn, data.length]);

  // Cargar primera página al montar
  useEffect(() => {
    fetchPage(null, true);
  }, []); // Solo ejecutar una vez al montar

  const loadMore = useCallback(() => {
    if (!loading && hasMore && lastDoc) {
      setLoading(true);
      fetchPage(lastDoc, false);
    }
  }, [loading, hasMore, lastDoc, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(null, true);
  }, [fetchPage]);

  return {
    data,
    loading,
    error,
    loadMore,
    hasMore,
    refresh,
    isEmpty: !loading && data.length === 0,
  };
}

/**
 * Hook específico para el dashboard con múltiples colecciones
 * @param {object} options - Opciones de configuración
 * @returns {object} - Datos combinados del dashboard
 */
export function useDashboardPagination(options = {}) {
  const { pageSize = 50 } = options;

  const properties = usePaginatedQuery('properties', {
    pageSize,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    filterFn: (p) => {
      const status = String(p.status || '').toLowerCase();
      return ['disponible', 'reservada', 'published'].includes(status);
    },
  });

  const clients = usePaginatedQuery('clients', {
    pageSize,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    filterFn: (c) => {
      const estado = String(c.estado || '').toLowerCase();
      return ['activo', 'active'].includes(estado);
    },
  });

  const contracts = usePaginatedQuery('contracts', {
    pageSize,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    filterFn: (c) => {
      const status = String(c.statusGeneral || '').toLowerCase();
      return ['vigente', 'active', 'activo', 'borrador'].includes(status);
    },
  });

  const visits = usePaginatedQuery('visits', {
    pageSize: Math.floor(pageSize / 2),
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });

  // Loading combinado
  const loading = properties.loading || clients.loading || contracts.loading || visits.loading;

  // Error combinado
  const error = properties.error || clients.error || contracts.error || visits.error;

  return {
    properties: properties.data,
    clients: clients.data,
    contracts: contracts.data,
    visits: visits.data,
    loading,
    error,
    refreshAll: () => {
      properties.refresh();
      clients.refresh();
      contracts.refresh();
      visits.refresh();
    },
    hasMoreProperties: properties.hasMore,
    hasMoreClients: clients.hasMore,
    hasMoreContracts: contracts.hasMore,
    hasMoreVisits: visits.hasMore,
    loadMoreProperties: properties.loadMore,
    loadMoreClients: clients.loadMore,
    loadMoreContracts: contracts.loadMore,
    loadMoreVisits: visits.loadMore,
  };
}

export default usePaginatedQuery;