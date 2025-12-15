import { useState } from 'react';
import { legalService } from '../services/legal.service';
import { FaUpload } from 'react-icons/fa';

const ContractForm = ({ onSuccess, initialData = null }) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const [formData, setFormData] = useState(initialData || {
    type: '',
    propertyId: '',
    parties: {
      seller: {
        name: '',
        idType: 'CC',
        idNumber: '',
        email: '',
        phone: ''
      },
      buyer: {
        name: '',
        idType: 'CC',
        idNumber: '',
        email: '',
        phone: ''
      },
      lawyer: ''
    },
    terms: {
      price: '',
      paymentMethod: '',
      specialConditions: []
    },
    expirationDate: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const parts = name.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      } else if (parts.length === 3) {
        const [parent, child, subchild] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [subchild]: value
            }
          }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (initialData) {
        await legalService.updateContract(initialData.id, formData);
      } else {
        await legalService.createContract(formData, documents);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica del contrato */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Información del contrato</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-light mb-2">Tipo de contrato *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            >
              <option value="">Seleccionar...</option>
              <option value="compraventa">Compraventa</option>
              <option value="arrendamiento">Arrendamiento</option>
              <option value="opcion">Opción de compra</option>
              <option value="promesa">Promesa de compraventa</option>
            </select>
          </div>

          <div>
            <label className="block text-light mb-2">ID de propiedad *</label>
            <input
              type="text"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              required
              placeholder="ID de la propiedad relacionada"
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Abogado responsable</label>
            <input
              type="text"
              name="parties.lawyer"
              value={formData.parties.lawyer}
              onChange={handleChange}
              placeholder="Nombre del abogado"
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Fecha de vencimiento</label>
            <input
              type="date"
              name="expirationDate"
              value={formData.expirationDate}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Datos del vendedor */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Vendedor / Arrendador</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-light mb-2">Nombre completo *</label>
            <input
              type="text"
              name="parties.seller.name"
              value={formData.parties.seller.name}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Tipo de documento *</label>
            <select
              name="parties.seller.idType"
              value={formData.parties.seller.idType}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            >
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="NIT">NIT</option>
            </select>
          </div>

          <div>
            <label className="block text-light mb-2">Número de documento *</label>
            <input
              type="text"
              name="parties.seller.idNumber"
              value={formData.parties.seller.idNumber}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Email</label>
            <input
              type="email"
              name="parties.seller.email"
              value={formData.parties.seller.email}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Teléfono</label>
            <input
              type="tel"
              name="parties.seller.phone"
              value={formData.parties.seller.phone}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Datos del comprador */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Comprador / Arrendatario</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-light mb-2">Nombre completo *</label>
            <input
              type="text"
              name="parties.buyer.name"
              value={formData.parties.buyer.name}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Tipo de documento *</label>
            <select
              name="parties.buyer.idType"
              value={formData.parties.buyer.idType}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            >
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="NIT">NIT</option>
            </select>
          </div>

          <div>
            <label className="block text-light mb-2">Número de documento *</label>
            <input
              type="text"
              name="parties.buyer.idNumber"
              value={formData.parties.buyer.idNumber}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Email</label>
            <input
              type="email"
              name="parties.buyer.email"
              value={formData.parties.buyer.email}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Teléfono</label>
            <input
              type="tel"
              name="parties.buyer.phone"
              value={formData.parties.buyer.phone}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Términos del contrato */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Términos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-light mb-2">Valor del contrato *</label>
            <input
              type="number"
              name="terms.price"
              value={formData.terms.price}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Método de pago</label>
            <input
              type="text"
              name="terms.paymentMethod"
              value={formData.terms.paymentMethod}
              onChange={handleChange}
              placeholder="Ej: Transferencia bancaria, efectivo"
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Documentos</h3>
        
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary/30 border-dashed rounded-lg cursor-pointer hover:border-primary transition">
          <FaUpload className="text-primary text-3xl mb-2" />
          <span className="text-light">Subir borrador del contrato</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={handleDocumentChange}
            className="hidden"
          />
        </label>

        {documents.length > 0 && (
          <div className="mt-4">
            <p className="text-light/70 text-sm">
              {documents.length} archivo(s) seleccionado(s)
            </p>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => onSuccess?.()}
          className="px-6 py-2 border border-primary/30 text-light rounded hover:bg-primary/10 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="button-gold"
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear contrato'}
        </button>
      </div>
    </form>
  );
};

export default ContractForm;