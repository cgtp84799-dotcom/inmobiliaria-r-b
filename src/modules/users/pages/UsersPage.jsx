import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaUserPlus,
  FaFilter,
  FaSearch,
  FaUsers,
  FaSpinner,
  FaTimesCircle,
  FaUserShield,
  FaShieldAlt,
  FaEye,
  FaInfoCircle
} from 'react-icons/fa';
import { userService } from '../services/user.service';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_ROLE_DESCRIPTIONS,
  hasPermission // ✅
} from '../types/user.types';
import UserCard from '../components/UserCard';
import { useAuth } from '../../../core/contexts/AuthContext';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';

const UsersPage = () => {
  const { currentUser } = useAuth();

  // ✅ Reemplaza isAdmin por permisos granulares
  const canCreate = hasPermission(currentUser?.role, 'users', 'create');
  const canUpdate = hasPermission(currentUser?.role, 'users', 'update');
  const canDelete = hasPermission(currentUser?.role, 'users', 'delete');

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [filters, setFilters] = useState({ searchTerm: '', role: '', status: '' });

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    role: USER_ROLES.MEMBER,
    status: 'active',
    password: ''
  });

  const [editingUser, setEditingUser] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Sí, confirmar',
    onConfirm: null,
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    let filtered = [...users];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term)
      );
    }
    if (filters.role) filtered = filtered.filter(user => user.role === filters.role);
    if (filters.status) filtered = filtered.filter(user => user.status === filters.status);
    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setFilters({ searchTerm: '', role: '', status: '' });
    setFilteredUsers(users);
  };

  const handleEdit = (user) => {
    if (!canUpdate) {
      toast.error('No tienes permisos para editar usuarios');
      return;
    }
    setEditingUser(user);
    setFormData({
      displayName: user.displayName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || USER_ROLES.MEMBER,
      status: user.status || 'active',
      password: ''
    });
    setModalOpen(true);
  };

  const handleDelete = (user) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar usuarios');
      return;
    }
    if (user.role === USER_ROLES.ADMIN) {
      toast.error('No se puede eliminar un administrador');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar usuario',
      message: `¿Seguro que quieres eliminar a ${user.displayName || user.email}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await userService.deleteUser(user.id);
          toast.success('Usuario eliminado');
          loadUsers();
        } catch (error) {
          console.error('Error eliminando usuario:', error);
          toast.error('Error al eliminar usuario');
        }
      },
    });
  };

  const handleChangeStatus = async (user) => {
    if (!canUpdate) {
      toast.error('No tienes permisos para cambiar el estado');
      return;
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.changeUserStatus(user.id, newStatus);
      toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
      loadUsers();
    } catch (error) {
      console.error('Error al cambiar de estado:', error);
      toast.error('Error al cambiar de estado');
    }
  };

  const handleResetPassword = (user) => {
    if (!canUpdate) {
      toast.error('No tienes permisos para resetear contraseñas');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Restablecer contraseña',
      message: `¿Enviar email de restablecimiento de contraseña a ${user.email}?`,
      confirmText: 'Sí, enviar email',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await userService.sendPasswordReset(user.email);
          toast.success('Email de restablecimiento enviado');
        } catch (error) {
          console.error('Error al enviar reset:', error);
          toast.error('Error al enviar email');
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate && !canUpdate) {
      toast.error('No tienes permisos para esta acción');
      return;
    }
    if (!formData.displayName || !formData.email || !formData.role) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id, {
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          status: formData.status
        });
        toast.success('Usuario actualizado');
      } else {
        if (!formData.password || formData.password.length < 6) {
          toast.error('La contraseña debe tener un mínimo de 6 caracteres');
          return;
        }
        await userService.createUser(
          {
            displayName: formData.displayName,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            status: formData.status
          },
          formData.password
        );
        toast.success('Usuario creado exitosamente');
      }

      setModalOpen(false);
      setEditingUser(null);
      setFormData({
        displayName: '',
        email: '',
        phone: '',
        role: USER_ROLES.MEMBER,
        status: 'active',
        password: ''
      });
      loadUsers();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      toast.error(error.message || 'Error al guardar usuario');
    }
  };

  const getUserStats = () => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === USER_ROLES.ADMIN).length,
    members: users.filter(u => u.role === USER_ROLES.MEMBER).length,
    viewers: users.filter(u => u.role === USER_ROLES.VIEWER).length
  });

  const stats = getUserStats();

  return (
    <div className="px-4 py-6 space-y-6">

      {/* ENCABEZADO */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">
            Gestión de usuarios
          </h1>
          <p className="text-muted text-sm">
            Administra el equipo de trabajo y controla los accesos al sistema.
          </p>
        </div>

        {/* ✅ Solo admin puede crear */}
        {canCreate && (
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                displayName: '',
                email: '',
                phone: '',
                role: USER_ROLES.MEMBER,
                status: 'active',
                password: ''
              });
              setModalOpen(true);
            }}
            className="button-gold inline-flex items-center gap-2 px-6 py-3"
          >
            <FaUserPlus />
            Nuevo usuario
          </button>
        )}
      </motion.div>

      {/* ESTADÍSTICAS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FaUsers className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-2xl font-bold text-light">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <FaUserShield className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Activos</p>
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <FaShieldAlt className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Administradores</p>
              <p className="text-2xl font-bold text-red-400">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FaUsers className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Equipo</p>
              <p className="text-2xl font-bold text-primary">{stats.members}</p>
            </div>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <FaEye className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Lectura</p>
              <p className="text-2xl font-bold text-slate-400">{stats.viewers}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* INFO DE ROLES */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-soft p-4 border-blue-500/20"
      >
        <div className="flex items-start gap-3">
          <FaInfoCircle className="text-blue-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-blue-400 font-semibold mb-2">Roles del sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-light font-semibold mb-1">✨ Administrador</p>
                <p className="text-slate-400 text-xs">{USER_ROLE_DESCRIPTIONS[USER_ROLES.ADMIN]}</p>
              </div>
              <div>
                <p className="text-light font-semibold mb-1">👥 Miembro del equipo</p>
                <p className="text-slate-400 text-xs">{USER_ROLE_DESCRIPTIONS[USER_ROLES.MEMBER]}</p>
              </div>
              <div>
                <p className="text-light font-semibold mb-1">👁️ Solo lectura</p>
                <p className="text-slate-400 text-xs">{USER_ROLE_DESCRIPTIONS[USER_ROLES.VIEWER]}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FILTROS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-soft border border-slate-800/80"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FaFilter className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-light">Filtros</h2>
              <p className="text-xs text-slate-400">Busca usuarios específicos</p>
            </div>
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="text-xs text-primary hover:underline"
          >
            {filtersOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs text-slate-400 mb-1">Búsqueda</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  placeholder="Nombre, correo electrónico, teléfono..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rol</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos los roles</option>
                  {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="pending">Pendiente</option>
                  <option value="blocked">Bloqueados</option>
                </select>
              </div>

              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-primary text-slate-950 font-semibold text-sm py-2.5 px-6 rounded-xl hover:bg-yellow-500 transition-all"
                >
                  <FaSearch />
                  Buscar
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-1 px-4 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl py-2.5 hover:border-slate-600 transition-all"
                >
                  <FaTimesCircle />
                  Limpiar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* CONTADOR */}
      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-slate-400 text-sm">
            <span className="text-primary font-bold">{filteredUsers.length}</span>{' '}
            {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
          </p>
        </motion.div>
      )}

      {/* LISTADO */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-soft py-16 text-center"
        >
          <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando usuarios...</p>
        </motion.div>
      ) : filteredUsers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-soft py-16 px-6 text-center border border-dashed border-slate-700"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <FaUsers className="text-primary text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-light mb-2">
            {users.length === 0 ? 'Aún no hay usuarios' : 'No se encontraron usuarios'}
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            {users.length === 0
              ? 'Crea el primer usuario usando el botón de arriba.'
              : 'Intenta ajustar los filtros de búsqueda.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={canUpdate ? handleEdit : null}           // ✅
              onDelete={canDelete ? handleDelete : null}       // ✅
              onChangeStatus={canUpdate ? handleChangeStatus : null} // ✅
              onResetPassword={canUpdate ? handleResetPassword : null} // ✅
              currentUserRole={currentUser?.role}
            />
          ))}
        </motion.div>
      )}

      {/* MODAL CREACIÓN/EDICIÓN */}
      {modalOpen && (canCreate || canUpdate) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-soft max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">
              {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Correo electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="usuario@ejemplo.com"
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="310 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecciona un rol</option>
                    {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="pending">Pendiente</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 button-gold">
                  {editingUser ? 'Actualizar usuario' : 'Crear usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ConfirmModal reutilizable */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default UsersPage;