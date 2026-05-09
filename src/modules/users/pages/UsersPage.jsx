// src/modules/users/pages/UsersPage.jsx
//
// FIX: handleDelete ahora pasa el rol del usuario a userService.deleteUser()
// para que cuando se elimine un viewer, también se elimine su doc en /clients.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaUserPlus, FaFilter, FaSearch, FaUsers, FaSpinner,
  FaTimesCircle, FaUserShield, FaShieldAlt, FaEye, FaInfoCircle,
  FaUserTie, FaPortrait,
} from 'react-icons/fa';
import { userService } from '../services/user.service';
import {
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS, hasPermission,
} from '../types/user.types';
import UserCard        from '../components/UserCard';
import UserEditModal   from '../components/UserEditModal';
import UserDetailPanel from '../components/UserDetailPanel';
import { useAuth }     from '../../../core/contexts/AuthContext';
import ConfirmModal    from '../../../shared/components/UI/ConfirmModal';
import { notificationService } from '../../../core/services/notificationService';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

const PANEL_ROLES  = [USER_ROLES.ADMIN, USER_ROLES.MEMBER];
const PORTAL_ROLES = [USER_ROLES.VIEWER];

const UsersPage = () => {
  const { currentUser, userData } = useAuth();

  const canCreate = hasPermission(userData?.role, 'users', 'create');
  const canUpdate = hasPermission(userData?.role, 'users', 'update');
  const canDelete = hasPermission(userData?.role, 'users', 'delete');

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('team');
  const [filtersOpen,  setFiltersOpen]  = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingUser,  setEditingUser]  = useState(null);
  const [filters,      setFilters]      = useState({ searchTerm: '', role: '', status: '' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', confirmText: 'Sí, confirmar', onConfirm: null,
  });
  const [detailUser,  setDetailUser]  = useState(null);
  const [panelOpen,   setPanelOpen]   = useState(false);

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

  const teamUsers   = useMemo(() => users.filter((u) => PANEL_ROLES.includes(u.role)),  [users]);
  const clientUsers = useMemo(() => users.filter((u) => PORTAL_ROLES.includes(u.role)), [users]);
  const activeUsers = activeTab === 'team' ? teamUsers : clientUsers;

  const filteredUsers = useMemo(() => {
    let result = [...activeUsers];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter((u) =>
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)       ||
        u.phone?.includes(filters.searchTerm)
      );
    }
    if (filters.role && activeTab === 'team') result = result.filter((u) => u.role === filters.role);
    if (filters.status) result = result.filter((u) => u.status === filters.status);
    return result;
  }, [activeUsers, filters, activeTab]);

  const stats = useMemo(() => ({
    teamTotal:     teamUsers.length,
    admins:        teamUsers.filter((u) => u.role === USER_ROLES.ADMIN).length,
    members:       teamUsers.filter((u) => u.role === USER_ROLES.MEMBER).length,
    clientTotal:   clientUsers.length,
    activeClients: clientUsers.filter((u) => u.status === 'active').length,
  }), [teamUsers, clientUsers]);

  const handleFilterChange = (field, value) =>
    setFilters((prev) => ({ ...prev, [field]: value }));
  const clearFilters = () => setFilters({ searchTerm: '', role: '', status: '' });

  const handleViewDetail = (user) => { setDetailUser(user); setPanelOpen(true); };
  const closePanel = () => setPanelOpen(false);

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

  const handleSave = async (formData, editing) => {
    if (editing && !canUpdate) throw new Error('Sin permisos para editar usuarios');
    if (!editing && !canCreate) throw new Error('Sin permisos para crear usuarios');
    if (editing) {
      await userService.updateUser(editing.id, {
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

      // ── NUEVO: Notificar a todos los administradores (excepto al creador) ──
      try {
        const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
        await Promise.all(
          adminsSnap.docs
            .filter((d) => d.id !== currentUser?.email)
            .map((d) =>
              notificationService.createNotification({
                userId: d.id,
                type: 'new_user',
                title: '🧑‍💼 Nuevo usuario creado',
                message: `Se ha creado el usuario ${formData.email} (${formData.displayName}) con rol ${formData.role}.`,
                actionUrl: '/usuarios',
              })
            )
        );
      } catch (e) {
        console.warn('[UsersPage] error notificando nuevo usuario:', e?.message);
      }
    }
    loadUsers();
  };

  // FIX: pasar el rol del usuario a deleteUser para que también limpie /clients
  const handleDelete = (user) => {
    if (!canDelete) { toast.error('No tienes permisos para eliminar usuarios'); return; }
    if (user.email === currentUser?.email) { toast.error('No puedes eliminar tu propia cuenta'); return; }

    const isClient = user.role === USER_ROLES.VIEWER;
    const warningMsg = isClient
      ? `¿Seguro que quieres eliminar al cliente ${user.displayName || user.email}?\n\nEsto eliminará:\n• Su acceso al portal\n• Su historial de favoritos\n• Su perfil de cliente\n\nEsta acción es permanente.`
      : `¿Seguro que quieres eliminar a ${user.displayName || user.email}? Esta acción no se puede deshacer.`;

    setConfirmModal({
      isOpen: true,
      title: isClient ? 'Eliminar cliente del portal' : 'Eliminar usuario',
      message: warningMsg,
      confirmText: 'Sí, eliminar definitivamente',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          // FIX: pasar el rol para que se limpie /clients si es viewer
          await userService.deleteUser(user.id, user.role);
          toast.success(isClient ? 'Cliente eliminado del portal y del sistema' : 'Usuario eliminado');

          // ── NUEVO: Notificar a todos los administradores ──────────────────
          try {
            const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
            const deletedUserEmail = user.email || user.id;
            await Promise.all(
              adminsSnap.docs.map((d) =>
                notificationService.createNotification({
                  userId: d.id,
                  type: 'user_deleted',
                  title: '🗑️ Usuario eliminado',
                  message: `El usuario ${deletedUserEmail} fue eliminado${isClient ? ' (cliente del portal)' : ''}.`,
                  actionUrl: '/usuarios',
                })
              )
            );
          } catch (e) {
            console.warn('[UsersPage] error notificando usuario eliminado:', e?.message);
          }

          loadUsers();
          closePanel();
        } catch (err) {
          toast.error(`Error al eliminar: ${err.message}`);
        }
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
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await userService.sendPasswordReset(user.email);
          toast.success('Email de restablecimiento enviado');
        } catch { toast.error('Error al enviar email'); }
      },
    });
  };

  const TABS = [
    {
      id:    'team',
      label: 'Equipo',
      icon:  FaUserTie,
      count: teamUsers.length,
      desc:  'Administradores y agentes del panel interno',
    },
    {
      id:    'clients',
      label: 'Clientes del portal',
      icon:  FaPortrait,
      count: clientUsers.length,
      desc:  'Usuarios registrados en el portal de clientes',
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">

      {/* Encabezado */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">Gestión de usuarios</h1>
          <p className="text-muted text-sm">Panel interno y portal de clientes separados.</p>
        </div>
        {canCreate && activeTab === 'team' && (
          <button onClick={openCreateModal} className="button-gold inline-flex items-center gap-2 px-6 py-3">
            <FaUserPlus /> Nuevo usuario
          </button>
        )}
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total equipo',     value: stats.teamTotal,     color: 'primary',   Icon: FaUsers      },
          { label: 'Admins',           value: stats.admins,        color: 'red-400',   Icon: FaShieldAlt  },
          { label: 'Agentes',          value: stats.members,       color: 'blue-400',  Icon: FaUserShield },
          { label: 'Clientes portal',  value: stats.clientTotal,   color: 'amber-400', Icon: FaPortrait   },
          { label: 'Clientes activos', value: stats.activeClients, color: 'green-400', Icon: FaEye        },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="card-soft p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`text-${color}`} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                <p className={`text-2xl font-bold text-${color} tabular-nums`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tabs de universo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="flex gap-2 border-b border-[var(--color-border)]">
        {TABS.map((t) => {
          const Icon   = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); clearFilters(); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                active ? 'border-primary text-primary' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="text-xs" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-primary/20 text-primary' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      <p className="text-[var(--color-text-muted)] text-xs -mt-3">
        {TABS.find((t) => t.id === activeTab)?.desc}
        {activeTab === 'clients' && (
          <span className="ml-1 text-[var(--color-text-faint)]">— Los clientes se registran desde el portal (/acceso-clientes).</span>
        )}
      </p>

      {/* Info roles */}
      {activeTab === 'team' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-soft p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="text-blue-400 mt-1 flex-shrink-0" />
            <div className="w-full">
              <h3 className="text-blue-400 font-semibold mb-3">Roles del panel interno</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {[USER_ROLES.ADMIN, USER_ROLES.MEMBER].map((id) => (
                  <div key={id} className="p-3 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)]">
                    <p className="text-light font-semibold mb-1">{USER_ROLE_LABELS[id]}</p>
                    <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">{USER_ROLE_DESCRIPTIONS[id]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filtros */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-soft border border-[var(--color-border)]/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FaFilter className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-light">Filtros</h2>
          </div>
          <button onClick={() => setFiltersOpen((v) => !v)} className="text-xs text-primary hover:underline">
            {filtersOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {filtersOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Búsqueda</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nombre, correo, teléfono..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {activeTab === 'team' && (
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Rol</label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary"
                  >
                    <option value="">Todos los roles</option>
                    <option value={USER_ROLES.ADMIN}>{USER_ROLE_LABELS[USER_ROLES.ADMIN]}</option>
                    <option value={USER_ROLES.MEMBER}>{USER_ROLE_LABELS[USER_ROLES.MEMBER]}</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary"
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="pending">Pendiente</option>
                  <option value="blocked">Bloqueados</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] hover:border-slate-600 rounded-xl transition-all"
                >
                  <FaTimesCircle /> Limpiar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Contador */}
      {!loading && (
        <p className="text-[var(--color-text-muted)] text-sm">
          <span className="text-primary font-bold tabular-nums">{filteredUsers.length}</span>{' '}
          {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="card-soft py-16 text-center">
          <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Cargando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card-soft py-16 px-6 text-center border border-dashed border-[var(--color-border)]">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <FaUsers className="text-primary text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-light mb-2">
            {activeUsers.length === 0 ? 'Aún no hay usuarios' : 'No se encontraron usuarios'}
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-md mx-auto mb-6">
            {activeUsers.length === 0
              ? activeTab === 'team'
                ? 'Crea el primer usuario del equipo con el botón de arriba.'
                : 'Los clientes se registran desde el portal (/acceso-clientes).'
              : 'Intenta ajustar los filtros de búsqueda.'}
          </p>
          {activeUsers.length === 0 && canCreate && activeTab === 'team' && (
            <button onClick={openCreateModal} className="button-gold inline-flex items-center gap-2 px-6 py-3">
              <FaUserPlus /> Crear primer usuario
            </button>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={canUpdate          ? handleEdit         : null}
              onDelete={canDelete        ? handleDelete        : null}
              onChangeStatus={canUpdate  ? handleChangeStatus  : null}
              onResetPassword={canUpdate ? handleResetPassword : null}
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
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
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