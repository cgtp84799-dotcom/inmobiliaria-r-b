import { useEffect, useState } from 'react';
import { contractService } from '../services/contract.service';

/**
 * useContract — carga y expone un contrato individual por ID.
 * Útil para ContractDetail.
 */
export function useContract(contractId) {
  const [contract, setContract] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!contractId) { setLoading(false); return; }
    setLoading(true);
    contractService
      .getContractById(contractId)
      .then((data) => { setContract(data); setLoading(false); })
      .catch((e)  => { setError(e);        setLoading(false); });
  }, [contractId]);

  return { contract, loading, error };
}
