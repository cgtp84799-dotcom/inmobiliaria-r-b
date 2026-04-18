// src/modules/contracts/hooks/useContractSubcollections.js
//
// Suscribe en tiempo real a milestones / payments / documents / history
// de un contrato. Pensado para ser consumido por las pestañas del
// ContractDetail y por el portal del cliente.

import { useEffect, useState } from 'react';
import {
  milestoneService, paymentService, contractDocumentService, historyService,
} from '../services/contract.subcollections.service';

export function useContractSubcollections(contractId) {
  const [milestones, setMilestones] = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [documents,  setDocuments]  = useState([]);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!contractId) { setLoading(false); return; }
    setLoading(true);

    const unsubs = [
      milestoneService.subscribe(contractId, setMilestones),
      paymentService.subscribe(contractId, setPayments),
      contractDocumentService.subscribe(contractId, setDocuments),
      historyService.subscribe(contractId, setHistory),
    ];

    // marcamos loading=false en el primer tick para no bloquear la UI
    const t = setTimeout(() => setLoading(false), 200);

    return () => {
      clearTimeout(t);
      unsubs.forEach((u) => u && u());
    };
  }, [contractId]);

  // Métricas derivadas para arriendo
  const paymentsSummary = (() => {
    if (!payments.length) return null;
    const total = payments.length;
    const paid  = payments.filter((p) => p.status === 'pagado').length;
    const late  = payments.filter((p) => p.status === 'vencido').length;
    const next  = payments.find((p) => p.status === 'pendiente');
    return { total, paid, late, next };
  })();

  return { milestones, payments, documents, history, loading, paymentsSummary };
}