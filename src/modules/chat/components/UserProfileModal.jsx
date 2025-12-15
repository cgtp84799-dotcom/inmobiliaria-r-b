import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaUser,
  FaEnvelope,
  FaCamera,
  FaSave,
  FaSignOutAlt,
  FaStore,
  FaTrash,
  FaEdit,
  FaExclamationTriangle,
  FaShieldAlt
} from 'react-icons/fa';
import { useAuth } from '../../../core/contexts/AuthContext';
import { updateProfile, deleteUser, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../../../core/config/firebase.config';
import toast from 'react-hot-toast';

const UserProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [photoPreview, setPhotoPreview] = useState(currentUser?.photoURL || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Guardando cambios...');

    try {
      let photoURL = currentUser.photoURL;

      // Subir foto si hay una nueva
      if (photoFile) {
        const timestamp = Date.now();
        const fileName = `profile_${currentUser.uid}_${timestamp}.jpg`;
        const photoRef = storageRef(storage, `users/${currentUser.uid}/${fileName}`);
        
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      // Actualizar perfil
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });

      toast.success('✓ Perfil actualizado', { id: toastId });
      setIsEditing(false);
      setPhotoFile(null);
      
      // Recargar para reflejar cambios
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      toast.error('Error al guardar cambios', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !password.trim()) {
      toast.error('Completa todos los campos');
      return;
    }

    const toastId = toast.loading('Cambiando correo...');

    try {
      // Re-autenticar
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Cambiar email
      await updateEmail(auth.currentUser, newEmail.trim());

      toast.success('✓ Correo actualizado', { id: toastId });
      setShowEmailChange(false);
      setNewEmail('');
      setPassword('');
      
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error cambiando email:', error);
      toast.error('Error: Verifica tu contraseña', { id: toastId });
    }
  };

  const handleDeleteAccount = async () => {
    const toastId = toast.loading('Eliminando cuenta...');

    try {
      // Eliminar foto de perfil si existe
      if (currentUser.photoURL && currentUser.photoURL.includes('firebase')) {
        try {
          const photoRef = storageRef(storage, currentUser.photoURL);
          await deleteObject(photoRef);
        } catch (e) {
          console.log('No se pudo eliminar la foto:', e);
        }
      }

      // Eliminar usuario
      await deleteUser(auth.currentUser);

      toast.success('✓ Cuenta eliminada', { id: toastId });
      onClose();
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      toast.error('Error: Re-inicia sesión e intenta de nuevo', { id: toastId });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('✓ Sesión cerrada');
      onClose();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleViewAsCatalog = () => {
    window.open('/catalogo', '_blank');
    toast.success('Abriendo vista de catálogo...');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-700"
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
            >
              <FaTimes className="text-white text-lg" />
            </button>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
              <FaUser />
              Mi Perfil
            </h2>
            <p className="text-slate-800 text-sm mt-1">Administra tu cuenta y preferencias</p>
          </div>

          {/* CONTENIDO */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
            
            {/* FOTO DE PERFIL */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Perfil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-yellow-400 shadow-xl">
                    <FaUser className="text-5xl text-slate-900" />
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-yellow-400 hover:bg-yellow-500 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-slate-900"
                >
                  <FaCamera className="text-slate-900" />
                </button>
              </div>
              
              {photoFile && (
                <p className="text-xs text-yellow-400 mt-2 font-semibold">
                  Nueva foto seleccionada
                </p>
              )}
            </div>

            {/* INFORMACIÓN DEL USUARIO */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <FaUser className="text-xs" />
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setIsEditing(true);
                  }}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-yellow-400 focus:outline-none transition-all"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <FaEnvelope className="text-xs" />
                  Correo electrónico
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="flex-1 bg-slate-800/50 border-2 border-slate-700 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed"
                  />
                  <button
                    onClick={() => setShowEmailChange(!showEmailChange)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl text-white transition-all"
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>

              {/* CAMBIAR EMAIL */}
              <AnimatePresence>
                {showEmailChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-800/50 border-2 border-yellow-400/30 rounded-xl p-4 space-y-3"
                  >
                    <h3 className="text-yellow-400 font-bold text-sm flex items-center gap-2">
                      <FaShieldAlt />
                      Cambiar correo electrónico
                    </h3>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Nuevo correo"
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-2 text-white focus:border-yellow-400 focus:outline-none text-sm"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña actual"
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-2 text-white focus:border-yellow-400 focus:outline-none text-sm"
                    />
                    <button
                      onClick={handleChangeEmail}
                      className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-xl font-bold text-sm transition-all"
                    >
                      Confirmar cambio
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BOTÓN GUARDAR CAMBIOS */}
            {isEditing && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-black text-lg transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
              >
                <FaSave />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </motion.button>
            )}

            {/* OPCIONES ADICIONALES */}
            <div className="space-y-3">
              <button
                onClick={handleViewAsCatalog}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-yellow-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3"
              >
                <FaStore />
                Ver como catálogo (cliente)
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-red-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3"
              >
                <FaSignOutAlt />
                Cerrar sesión
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 border-2 border-red-500/30 hover:border-red-500 text-red-400 rounded-xl font-bold transition-all flex items-center justify-center gap-3"
              >
                <FaTrash />
                Eliminar cuenta
              </button>
            </div>

            {/* CONFIRMACIÓN DE ELIMINACIÓN */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
                >
                  <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full">
                    <div className="text-center mb-6">
                      <FaExclamationTriangle className="text-red-500 text-5xl mx-auto mb-4" />
                      <h3 className="text-xl font-black text-white mb-2">
                        ¿Eliminar cuenta?
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Esta acción es <span className="text-red-400 font-bold">PERMANENTE</span> y no se puede deshacer.
                        Perderás todos tus datos.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all"
                      >
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfileModal;