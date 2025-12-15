import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FaUserPlus } from 'react-icons/fa';
import { requestService } from '../services/request.service';
import { useNavigate } from 'react-router-dom';

const AccessRequestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.name || !formData.password) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await requestService.createRequest({
        email: formData.email,
        name: formData.name,
        phone: '',
        message: formData.message || 'Solicitud de acceso al sistema'
      });

      toast.success('Solicitud enviada exitosamente. Te contactaremos pronto.');
      
      setFormData({ email: '', password: '', name: '', message: '' });
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      toast.error('Error al enviar solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block mb-4"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
              <FaUserPlus className="text-slate-950 text-3xl" />
            </div>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
              Acceso autorizado
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Solo para agentes y personal de Rincón Bedoya & Asociados
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FaUserPlus className="text-primary text-xl" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Solicitar acceso</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tu@correo.com"
                className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña deseada <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Motivo de la solicitud
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Cuéntanos por qué necesitas acceso..."
                rows={4}
                className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary to-yellow-600 hover:from-yellow-500 hover:to-primary 
                         text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-primary/50 
                         transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                         transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-3.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-semibold rounded-xl 
                         border border-slate-700/50 hover:border-slate-600 transition-all duration-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-500 text-sm mt-6"
        >
          ¿Ya tienes una cuenta?{' '}
          <button
            onClick={() => navigate('/acceso')}
            className="text-primary hover:text-yellow-500 font-semibold transition-colors duration-300"
          >
            Inicia sesión aquí
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AccessRequestPage;
