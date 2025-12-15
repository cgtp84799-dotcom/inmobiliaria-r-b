import { useState } from 'react';
import { clientService } from '../services/client.service';

const ClientForm = ({ onSuccess, initialData = null }) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState(initialData || {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      idType: 'CC',
      idNumber: '',
      address: ''
    },
    preferences: {
      propertyTypes: [],
      priceRange: { min: '', max: '' },
      locations: [],
      features: {}
    },
    status: 'lead',
    assignedAgent: '',
    source: 'web'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (initialData) {
        await clientService.updateClient(initialData.id, formData);
      } else {
        await clientService.createClient(formData);
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
      {/* Información personal */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Información personal</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-light mb-2">Nombre completo *</label>
            <input
              type="text"
              name="personalInfo.name"
              value={formData.personalInfo.name}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Email *</label>
            <input
              type="email"
              name="personalInfo.email"
              value={formData.personalInfo.email}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Teléfono *</label>
            <input
              type="tel"
              name="personalInfo.phone"
              value={formData.personalInfo.phone}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Tipo de documento *</label>
            <select
              name="personalInfo.idType"
              value={formData.personalInfo.idType}
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
              name="personalInfo.idNumber"
              value={formData.personalInfo.idNumber}
              onChange={handleChange}
              required
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-light mb-2">Dirección</label>
            <input
              type="text"
              name="personalInfo.address"
              value={formData.personalInfo.address}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Información del proceso */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Proceso comercial</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-light mb-2">Estado del cliente *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            >
              <option value="lead">Lead</option>
              <option value="interested">Interesado</option>
              <option value="negotiating">En negociación</option>
              <option value="closed">Cerrado</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="block text-light mb-2">Origen del cliente *</label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            >
              <option value="web">Sitio web</option>
              <option value="referral">Referido</option>
              <option value="social">Redes sociales</option>
              <option value="direct">Directo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-light mb-2">Agente asignado</label>
            <input
              type="text"
              name="assignedAgent"
              value={formData.assignedAgent}
              onChange={handleChange}
              placeholder="ID del agente"
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div className="bg-black/40 border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4">Preferencias</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-light mb-2">Presupuesto mínimo</label>
            <input
              type="number"
              name="preferences.priceRange.min"
              value={formData.preferences.priceRange.min}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-light mb-2">Presupuesto máximo</label>
            <input
              type="number"
              name="preferences.priceRange.max"
              value={formData.preferences.priceRange.max}
              onChange={handleChange}
              className="w-full bg-dark border border-primary/30 rounded px-4 py-2 text-light focus:border-primary outline-none"
            />
          </div>
        </div>
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
          {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;