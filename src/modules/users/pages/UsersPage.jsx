// src/modules/users/pages/UsersPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaUserPlus, FaFilter, FaSearch, FaUsers, FaSpinner,
  FaTimesCircle, FaUserShield, FaShieldAlt, FaEye, FaInfoCircle,
} from 'react-icons/fa';
import { userService } from '../services/user.service';
import {
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS,
  hasPermission,
} from '../types/user.types';
import UserCard        from '../components/UserCard';
import UserEditModal   from '../components/UserEditModal';
import UserDetailPanel from '../components/UserDetailPanel';
import { useAuth }     from '../../../core/contexts/AuthContext';
import ConfirmModal    from '../../../shared/components/UI/ConfirmModal';


const UsersPage = () => {
  const { currentUser, userData } = useAuth();

  const canCreate = hasPermission(userData?.role, 'users', 'create');
  const canUpdate = hasPermission(userData?.role, 'users', 'update');
  const canDelete = hasPermission(userData?.role, 'users', 'delete');

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filtersOpen,  setFiltersOpen]  = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingUser,  setEditingUser]  = useState(null);
  const [filters,      setFilters]      = useState({ searchTerm: '', role: '', status: '' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', confirmText: 'Sí, confirmar', onConfirm: null,
  });
  const [detailUser,   setDetailUser]   = useState(null);
  const [panelOpen,    setPanelOpen]    = useState(false);

  // ── Datos derivados ───────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(u =>
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)       ||
        u.phone?.includes(filters.searchTerm)
      );
    }
    if (filters.role)   result = result.filter(u => u.role   === filters.role);
    if (filters.status) result = result.filter(u => u.status === filters.status);
    return result;
  }, [users, filters]);

  // ✅ Sin AGENT — solo los 3 roles reales
  const stats = useMemo(() => ({
    total:   users.length,
    active:  users.filter(u => u.status === 'active').length,
    admins:  users.filter(u => u.role === USER_ROLES.ADMIN).length,
    members: users.filter(u => u.role === USER_ROLES.MEMBER).length,
    viewers: users.filter(u => u.role === USER_ROLES.VIEWER).length,
  }), [users]);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const handleFilterChange = (field, value) =>
    setFilters(prev => ({ ...prev, [field]: value }));

  const clearFilters = () =>
    setFilters({ searchTerm: '', role: '', status: '' });

  // ── Panel lateral ────────────────────────────────────────────────────────
  const handleViewDetail = (user) => { setDetailUser(user); setPanelOpen(true); };
  const closePanel = () => setPanelOpen(false);

  // ── Modal crear / editar ─────────────────────────────────────────────────
  const openCreateModal = () => {
    if (!canCreate) { toast.error('No tienes permisos para crear usuarios'); return; }
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    if (!canUpdate) { toast.error('No tienes permisos para editar usuarios'); return; }
    setEditingUser(user);
    setModalOpen(true);
    closePanel();
  };

  const closeModal = () => { setModalOpen(false); setEditingUser(null); };

  const handleSave = async (formData, editingUser) => {
    if (editingUser && !canUpdate) throw new Error('Sin permisos para editar usuarios');
    if (!editingUser && !canCreate) throw new Error('Sin permisos para crear usuarios');
    if (editingUser) {
      await userService.updateUser(editingUser.id, {
        displayName: formData.displayName,
        email:       formData.email,
        phone:       formData.phone,
        role:        formData.role,
        status:      formData.status,
      });
      toast.success('Usuario actualizado');
    } else {
      await userService.createUser(
        { displayName: formData.displayName, email: formData.email, phone: formData.phone, role: formData.role, status: formData.status },
        formData.password
      );
      toast.success('Usuario creado exitosamente');
    }
    loadUsers();
  };

  // ── Acciones de tarjeta ──────────────────────────────────────────────────
  const handleDelete = (user) => {
    if (!canDelete) { toast.error('No tienes permisos para eliminar usuarios'); return; }
    if (user.email === currentUser?.email) { toast.error('No puedes eliminar tu propia cuenta'); return; }
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar usuario',
      message: `¿Seguro que quieres eliminar a ${user.displayName || user.email}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await userService.deleteUser(user.id);
          toast.success('Usuario eliminado');
          loadUsers();
          closePanel();
        } catch { toast.error('Error al eliminar usuario'); }
      },
    });
  };

  const handleChangeStatus = async (user) => {
    if (!canUpdate) { toast.error('No tienes permisos para cambiar el estado'); return; }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.changeUserStatus(user.id, newStatus);
      toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
      loadUsers();
    } catch { toast.error('Error al cambiar el estado'); }
  };

  const handleResetPassword = (user) => {
    if (!canUpdate) { toast.error('No tienes permisos para resetear contraseñas'); return; }
    setConfirmModal({
      isOpen: true,
      title: 'Restablecer contraseña',
      message: `¿Enviar email de restablecimiento de contraseña a ${user.email}?`,
      confirmText: 'Sí, enviar email',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await userService.sendPasswordReset(user.email);
          toast.success('Email de restablecimiento enviado');
        } catch { toast.error('Error al enviar email'); }
      },
    });
  };

  // ── KPI rows: 5 tarjetas (sin Agentes) ──────────────────────────────────
  const KPI_ITEMS = [
    { id: 'total',   label: 'Total',        value: stats.total,   color: 'primary',   Icon: FaUsers      },
    { id: 'active',  label: 'Activos',      value: stats.active,  color: 'green-400', Icon: FaUserShield },
    { id: 'admins',  label: 'Admins',       value: stats.admins,  color: 'red-400',   Icon: FaShieldAlt  },
    { id: 'members', label: 'Agentes',      value: stats.members, color: 'blue-400',  Icon: FaUsers      },
    { id: 'viewers', label: 'Solo lectura', value: stats.viewers, color: 'slate-400', Icon: FaEye        },
  ];

  // ── Roles del sistema: solo los 3 que existen ────────────────────────────
  const ROLE_INFO = [
    { id: USER_ROLES.ADMIN,  emoji: '✨', label: 'Administrador'     },
    { id: USER_ROLES.MEMBER, emoji: '👥', label: 'Agente inmobiliario'},
    { id: USER_ROLES.VIEWER, emoji: '👁️', label: 'Solo lectura'      },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 space-y-6">

      {/* Encabezado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">Gestión de usuarios</h1>
          <p className="text-muted text-sm">Administra el equipo de trabajo y controla los accesos al sistema.</p>
        </div>
        {canCreate && (
          <button onClick={openCreateModal} className="button-gold inline-flex items-center gap-2 px-6 py-3">
            <FaUserPlus /> Nuevo usuario
          </button>
        )}
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {KPI_ITEMS.map(({ id, label, value, color, Icon }) => (
          <div key={id} className="card-soft p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`text-${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-2xl font-bold text-${color} tabular-nums`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Info roles */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-soft p-4 border border-blue-500/20"
      >
        <div className="flex items-start gap-3">
          <FaInfoCircle className="text-blue-400 mt-1 flex-shrink-0" />
          <div className="w-full">
            <h3 className="text-blue-400 font-semibold mb-3">Roles del sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {ROLE_INFO.map(({ id, emoji, label }) => (
                <div key={id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-light font-semibold mb-1">{emoji} {label}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{USER_ROLE_DESCRIPTIONS[id]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filtros */}
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
          <button onClick={() => setFiltersOpen(v => !v)} className="text-xs text-primary hover:underline">
            {filtersOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {filtersOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Búsqueda</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none"><FaSearch /></span>
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
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl transition-all"
                >
                  <FaTimesCircle /> Limpiar filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Contador */}
      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-slate-400 text-sm">
            <span className="text-primary font-bold tabular-nums">{filteredUsers.length}</span>{' '}
            {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
          </p>
        </motion.div>
      )}

      {/* Grid de usuarios */}
      {loading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-soft py-16 text-center">
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
          {users.length === 0 && canCreate && (
            <button onClick={openCreateModal} className="button-gold inline-flex items-center gap-2 px-6 py-3">
              <FaUserPlus /> Crear primer usuario
            </button>
          )}
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
              onEdit={canUpdate           ? handleEdit         : null}
              onDelete={canDelete         ? handleDelete        : null}
              onChangeStatus={canUpdate   ? handleChangeStatus  : null}
              onResetPassword={canUpdate  ? handleResetPassword : null}
              onViewDetail={handleViewDetail}
              currentUserRole={userData?.role}
            />
          ))}
        </motion.div>
      )}

      <UserEditModal
        editingUser={editingUser}
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        currentUserRole={userData?.role}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <UserDetailPanel
        user={detailUser}
        isOpen={panelOpen}
        onClose={closePanel}
        onEdit={canUpdate          ? handleEdit         : null}
        onChangeStatus={canUpdate  ? handleChangeStatus  : null}
        onResetPassword={canUpdate ? handleResetPassword : null}
      />
    </div>
  );
};

export default UsersPage;
