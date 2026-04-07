// src/modules/users/pages/RequestsPage.jsx
//
// Vista de solicitudes de acceso pendientes — solo admin.
// El admin puede: aprobar (asignando rol) o rechazar.
// Al aprobar: crea el usuario en Firestore via userService.createUser()
// con contraseña temporal aleatoria y envía reset de contraseña al email.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaInbox, FaCheck, FaTimes, FaSpinner, FaFilter,
  FaUser, FaEnvelope, FaPhone, FaCommentAlt, FaClock,
  FaShieldAlt, FaUsers, FaEye,
} from 'react-icons/fa';
import { requestService } from '../services/request.service';
import { userService }    from '../services/user.service';
import { useAuth }        from '../../../core/contexts/AuthContext';
import { USER_ROLES, USER_ROLE_LABELS } from '../types/user.types';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';

// Contraseña temporal aleatoria — el usuario la reemplaza con el reset email
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date instanceof Date ? date : date.toDate?.() ?? new Date(date));
};

const STATUS_LABELS = {
  pending:  { label: 'Pendiente',  color: 'yellow' },
  approved: { label: 'Aprobada',   color: 'green'  },
  rejected: { label: 'Rechazada',  color: 'red'    },
};

const ROLE_ICONS = {
  [USER_ROLES.ADMIN]:  FaShieldAlt,
  [USER_ROLES.MEMBER]: FaUsers,
  [USER_ROLES.VIEWER]: FaEye,
};


const RequestsPage = () => {
  const { userData } = useAuth();

  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', confirmText: '', onConfirm: null,
  });

  // Estado de aprobación por solicitud (para el selector de rol)
  const [approveState, setApproveState] = useState({}); // { [requestId]: role }


  // ── Carga ────────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestService.getAllRequests(
        filterStatus ? { status: filterStatus } : {}
      );
      setRequests(data);
    } catch {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadRequests(); }, [loadRequests]);


  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);


  // ── Aprobar ──────────────────────────────────────────────────────────────

  const handleApprove = (request) => {
    const role = approveState[request.id] || USER_ROLES.MEMBER;
    const RoleIcon = ROLE_ICONS[role];

    setConfirmModal({
      isOpen: true,
      title: 'Aprobar solicitud',
      message: `¿Aprobar a ${request.name} como ${USER_ROLE_LABELS[role]}? 
        Se creará su cuenta y recibirá un email para configurar su contraseña.`,
      confirmText: 'Sí, aprobar y crear cuenta',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const toastId = toast.loading('Creando cuenta...');
        try {
          // 1. Crear usuario en Auth + Firestore
          await userService.createUser(
            {
              displayName: request.name,
              email:       request.email,
              phone:       request.phone || '',
              role,
              status: 'active',
            },
            generateTempPassword()
          );

          // 2. Enviar email de reset para que el usuario establezca su contraseña
          await userService.sendPasswordReset(request.email);

          // 3. Marcar solicitud como aprobada
          await requestService.approveRequest(request.id, role, userData?.email);

          toast.success(
            `Cuenta creada para ${request.name}. Email de acceso enviado.`,
            { id: toastId }
          );
          loadRequests();
        } catch (error) {
          // Error de email duplicado en Auth
          if (error.code === 'auth/email-already-in-use') {
            // El usuario ya tiene cuenta — solo aprobar la solicitud
            await requestService.approveRequest(request.id, role, userData?.email).catch(() => {});
            toast.success(
              `${request.name} ya tiene cuenta. Solicitud marcada como aprobada.`,
              { id: toastId }
            );
            loadRequests();
          } else {
            toast.error('Error al crear la cuenta. Inténtalo de nuevo.', { id: toastId });
          }
        }
      },
    });
  };


  // ── Rechazar ─────────────────────────────────────────────────────────────

  const handleReject = (request) => {
    setConfirmModal({
      isOpen: true,
      title: 'Rechazar solicitud',
      message: `¿Rechazar la solicitud de ${request.name} (${request.email})?`,
      confirmText: 'Sí, rechazar',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await requestService.rejectRequest(request.id, userData?.email);
          toast.success('Solicitud rechazada');
          loadRequests();
        } catch {
          toast.error('Error al rechazar la solicitud');
        }
      },
    });
  };


  // ── Eliminar ─────────────────────────────────────────────────────────────

  const handleDelete = (request) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar solicitud',
      message: `¿Eliminar definitivamente la solicitud de ${request.name}?`,
      confirmText: 'Sí, eliminar',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await requestService.deleteRequest(request.id);
          toast.success('Solicitud eliminada');
          loadRequests();
        } catch {
          toast.error('Error al eliminar la solicitud');
        }
      },
    });
  };


  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 space-y-6">

      {/* Encabezado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">
            Solicitudes de acceso
          </h1>
          <p className="text-muted text-sm">
            Aprueba o rechaza solicitudes de nuevos usuarios.
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total',     value: stats.total,    color: 'primary' },
          { label: 'Pendientes',value: stats.pending,  color: 'yellow-400' },
          { label: 'Aprobadas', value: stats.approved, color: 'green-400' },
          { label: 'Rechazadas',value: stats.rejected, color: 'red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-soft p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold text-${color} tabular-nums`}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Filtro de estado */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <FaFilter className="text-slate-400 text-sm" />
        {[{ value: '', label: 'Todas' }, ...Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))]
          .map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${ filterStatus === value
                  ? 'bg-primary text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700' }`}
            >
              {label}
            </button>
          ))
        }
      </motion.div>

      {/* Listado */}
      {loading ? (
        <div className="card-soft py-16 text-center">
          <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando solicitudes...</p>
        </div>

      ) : requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-soft py-16 px-6 text-center border border-dashed border-slate-700"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <FaInbox className="text-primary text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-light mb-2">Sin solicitudes</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            {filterStatus === 'pending'
              ? 'No hay solicitudes pendientes por revisar.'
              : 'No hay solicitudes en este estado.'}
          </p>
        </motion.div>

      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requests.map((req) => {
              const statusInfo   = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
              const selectedRole = approveState[req.id] || USER_ROLES.MEMBER;

              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  className="card-soft border border-slate-800/80 flex flex-col gap-4"
                >
                  {/* Cabecera de tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FaUser className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-light truncate">{req.name || '—'}</p>
                        <p className="text-xs text-slate-400">
                          <FaClock className="inline mr-1" />
                          {formatDate(req.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0
                      bg-${statusInfo.color}-400/10 text-${statusInfo.color}-400`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Datos de contacto */}
                  <div className="space-y-1.5 text-sm">
                    <p className="text-slate-300 flex items-center gap-2">
                      <FaEnvelope className="text-slate-500 flex-shrink-0" />
                      <span className="truncate">{req.email}</span>
                    </p>
                    {req.phone && (
                      <p className="text-slate-300 flex items-center gap-2">
                        <FaPhone className="text-slate-500 flex-shrink-0" />
                        {req.phone}
                      </p>
                    )}
                    {req.message && (
                      <p className="text-slate-400 flex items-start gap-2 text-xs mt-2">
                        <FaCommentAlt className="text-slate-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-3">{req.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Acciones — solo para pendientes */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800">
                      {/* Selector de rol */}
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setApproveState(prev => ({ ...prev, [req.id]: e.target.value }))
                        }
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg
                          py-2 px-3 text-sm text-light focus:outline-none focus:border-primary"
                      >
                        {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleApprove(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                          font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20
                          border border-green-500/20 transition-all"
                      >
                        <FaCheck /> Aprobar
                      </button>

                      <button
                        onClick={() => handleReject(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                          font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20
                          border border-red-500/20 transition-all"
                      >
                        <FaTimes /> Rechazar
                      </button>
                    </div>
                  )}

                  {/* Info si ya fue procesada */}
                  {req.status !== 'pending' && req.approvedBy && (
                    <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">
                      {req.status === 'approved' ? 'Aprobada' : 'Rechazada'} por{' '}
                      <span className="text-slate-400">{req.approvedBy}</span>
                    </p>
                  )}

                  {/* Botón eliminar — solo aprobadas/rechazadas */}
                  {req.status !== 'pending' && (
                    <button
                      onClick={() => handleDelete(req)}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors self-end"
                    >
                      Eliminar registro
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default RequestsPage;
