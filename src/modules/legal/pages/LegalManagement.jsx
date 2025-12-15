import { useEffect, useState } from 'react';
import { legalService } from '../services/legal.service';
import ContractForm from '../components/ContractForm';
import { FaPlus, FaEdit, FaTrash, FaFileAlt } from 'react-icons/fa';

const LegalManagement = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await legalService.getAllContracts();
      setContracts(data);
    } catch (error) {
      console.error('Error cargando contratos', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleNewContract = () => {
    setEditingContract(null);
    setShowForm(true);
  };

  const handleEditContract = (contract) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleDeleteContract = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este contrato?')) return;
    await legalService.deleteContract(id);
    loadContracts();
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingContract(null);
    loadContracts();
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400',
      review: 'bg-blue-500/20 text-blue-400',
      pending_signature: 'bg-yellow-500/20 text-yellow-400',
      signed: 'bg-green-500/20 text-green-400',
      registered: 'bg-purple-500/20 text-purple-400',
      completed: 'bg-green-600/20 text-green-600'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Gestión Legal</h1>
          <p className="text-light/70 text-sm">
            Contratos, documentos jurídicos, seguimiento y control legal completo.
          </p>
        </div>
        <button onClick={handleNewContract} className="button-gold flex items-center space-x-2">
          <FaPlus />
          <span>Nuevo contrato</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-black/50 border border-primary/30 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">
            {editingContract ? 'Editar contrato' : 'Nuevo contrato'}
          </h2>
          <ContractForm initialData={editingContract} onSuccess={handleFormSuccess} />
        </div>
      )}

      <div className="bg-black/40 border border-primary/30 rounded-xl p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Contratos registrados</h3>

        {loading ? (
          <p className="text-light/70">Cargando contratos...</p>
        ) : contracts.length === 0 ? (
          <p className="text-light/70">Aún no hay contratos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-black/60 border-b border-primary/30">
                  <th className="px-4 py-3 text-left text-primary">Tipo</th>
                  <th className="px-4 py-3 text-left text-primary">Vendedor</th>
                  <th className="px-4 py-3 text-left text-primary">Comprador</th>
                  <th className="px-4 py-3 text-left text-primary">Valor</th>
                  <th className="px-4 py-3 text-left text-primary">Estado</th>
                  <th className="px-4 py-3 text-left text-primary">Abogado</th>
                  <th className="px-4 py-3 text-left text-primary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-primary/10 hover:bg-white/5">
                    <td className="px-4 py-3 text-light">{contract.type}</td>
                    <td className="px-4 py-3 text-light/80">{contract.parties?.seller?.name}</td>
                    <td className="px-4 py-3 text-light/80">{contract.parties?.buyer?.name}</td>
                    <td className="px-4 py-3 text-light/80">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(contract.terms?.price || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-light/80">{contract.parties?.lawyer || 'Sin asignar'}</td>
                    <td className="px-4 py-3 flex space-x-2">
                      <button
                        onClick={() => handleEditContract(contract)}
                        className="px-3 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
                        className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalManagement;