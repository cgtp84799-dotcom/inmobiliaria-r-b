import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaUser, FaPhone } from 'react-icons/fa';
import { useAuth } from '../../../core/contexts/AuthContext';
import { requestService } from '../../users/services/request.service';
import toast from 'react-hot-toast';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  
  // ✅ DATOS DEL FORMULARIO DE SOLICITUD - ACTUALIZADO
  const [requestData, setRequestData] = useState({
    email: '',
    name: '',
    phone: '', // ✅ NUEVO
    message: '' // ✅ RENOMBRADO (antes era 'reason')
  });

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Acceso autorizado');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error de autenticación:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Usuario no autorizado o credenciales incorrectas');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Credenciales inválidas');
      } else {
        toast.error('Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTUALIZADO PARA USAR EL SERVICIO NUEVO
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ USAR EL SERVICIO NUEVO
      await requestService.createRequest({
        email: requestData.email,
        name: requestData.name,
        phone: requestData.phone,
        message: requestData.message
      });

      toast.success('¡Solicitud enviada! Un administrador revisará tu petición.');
      setShowRequestAccess(false);
      setRequestData({ email: '', name: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      toast.error(error.message || 'Error al enviar solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 via-primary to-yellow-600 rounded-2xl mb-4 shadow-2xl shadow-primary/30"
          >
            <FaShieldAlt className="text-slate-950 text-3xl" />
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-primary to-yellow-600 bg-clip-text text-transparent mb-2">
            Acceso Autorizado
          </h1>
          <p className="text-slate-400 text-sm">
            Solo para agentes y personal de Rincón Bedoya & Asociados
          </p>
        </div>

        {/* Formulario de Login */}
        {!showRequestAccess ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 shadow-2xl"
          >
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3.5 
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                               placeholder:text-slate-600"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Contraseña
                </label>
                <div className="relative group">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3.5 
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                               placeholder:text-slate-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-400 via-primary to-yellow-600 text-slate-950 font-bold 
                           rounded-xl py-3.5 hover:shadow-xl hover:shadow-primary/40 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Verificando acceso...' : 'Ingresar al panel'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
              <button
                onClick={() => setShowRequestAccess(true)}
                className="text-sm text-slate-400 hover:text-primary transition-colors font-medium"
              >
                ¿No tienes acceso? <span className="text-primary">Solicitar autorización →</span>
              </button>
            </div>
          </motion.div>
        ) : (
          // ✅ FORMULARIO DE SOLICITUD - ACTUALIZADO CON TELÉFONO
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-light mb-6 flex items-center gap-2">
              <FaUser className="text-primary" />
              Solicitar acceso
            </h2>
            
            <form onSubmit={handleRequestAccess} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={requestData.email}
                    onChange={(e) => setRequestData({...requestData, email: e.target.value})}
                    className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3 
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                               placeholder:text-slate-600"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={requestData.name}
                    onChange={(e) => setRequestData({...requestData, name: e.target.value})}
                    className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3 
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                               placeholder:text-slate-600"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
              </div>

              {/* ✅ TELÉFONO - NUEVO */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Teléfono (opcional)
                </label>
                <div className="relative group">
                  <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="tel"
                    value={requestData.phone}
                    onChange={(e) => setRequestData({...requestData, phone: e.target.value})}
                    className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3 
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                               placeholder:text-slate-600"
                    placeholder="310 123 4567"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Motivo de la solicitud <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={requestData.message}
                  onChange={(e) => setRequestData({...requestData, message: e.target.value})}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                             placeholder:text-slate-600 resize-none"
                  rows="4"
                  placeholder="Cuéntanos por qué necesitas acceso..."
                  required
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestAccess(false)}
                  disabled={loading}
                  className="flex-1 bg-slate-800 text-slate-300 font-semibold rounded-xl py-3 
                             hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-yellow-400 via-primary to-yellow-600 text-slate-950 font-bold 
                             rounded-xl py-3 hover:shadow-xl hover:shadow-primary/40 transition-all disabled:opacity-50
                             hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Volver al inicio */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors font-medium"
          >
            <FaArrowLeft className="text-xs" />
            Volver al inicio
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;