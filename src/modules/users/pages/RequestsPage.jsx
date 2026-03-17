import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaEnvelope,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaPhone
} from 'react-icons/fa';
import { requestService } from '../services/request.service';
import { userService } from '../services/user.service';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  hasPermission // ✅
} from '../types/user.types';
import { useAuth } from '../../../core/contexts/AuthContext';
import { auth } from '../../../core/config/firebase.config';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';

const CREATE_USER_FUNCTION_URL =
  'https://us-central1-inmobiliaria-ryb-y-asociados.cloudfunctions.net/createUserByAdmin';

const RequestsPage = () => {
  const { currentUser } = useAuth();

  // ✅ Reemplaza isAdmin — solo admin puede gestionar solicitudes
  const canManage = hasPermission(currentUser?.role, 'users', 'create');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRole, setSelectedRole] = useState(USER_ROLES.MEMBER);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await requestService.getAllRequests({
        status: filter !== 'all' ? filter : null
      });
      setRequests(data);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setSelectedRole(USER_ROLES.MEMBER);
    setShowApproveModal(true);
  };

  const createUserByAdmin = async (payload) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No estás autenticado');
    const token = await user.getIdToken();
    const response = await fetch(CREATE_USER_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data: payload })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Error creando usuario');
    return body;
  };

  const handleApprove = async () => {
    if (!canManage) {
      toast.error('No tienes permisos para aprobar solicitudes');
      return;
    }
    if (!selectedRequest?.id || !selectedRequest?.email) return;

    setProcessingId(selectedRequest.id);
    try {
      let userExists = false;
      try {
        await userService.getUserById(selectedRequest.email);
        userExists = true;
      } catch {
        userExists = false;
      }

      if (userExists) {
        await userService.updateUser(selectedRequest.email, {
          role: selectedRole,
          status: 'active'
        });
      } else {
        const defaultPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
        await createUserByAdmin({
          displayName: selectedRequest.name || '',
          email: selectedRequest.email,
          phone: selectedRequest.phone || '',
          role: selectedRole,
          status: 'active',
          password: defaultPassword
        });
        try {
          await userService.sendPasswordReset(selectedRequest.email);
        } catch (emailError) {
          console.warn('⚠️ No se pudo enviar email de reset:', emailError?.message);
        }
      }

      await requestService.approveRequest(
        selectedRequest.id,
        selectedRole,
        currentUser.email
      );

      toast.success(
        userExists
          ? 'Usuario actualizado y solicitud aprobada'
          : 'Usuario creado y solicitud aprobada. Email enviado.'
      );

      setShowApproveModal(false);
      setSelectedRequest(null);
      await loadRequests();
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      toast.error(error.message || 'Error al aprobar solicitud');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (request) => {
    if (!canManage) {
      toast.error('No tienes permisos para rechazar solicitudes');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Rechazar solicitud',
      message: `¿Seguro que quieres rechazar la solicitud de ${request.name}?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setProcessingId(request.id);
        try {
          await requestService.rejectRequest(request.id, currentUser.email);
          toast.success('Solicitud rechazada');
          await loadRequests();
        } catch (error) {
          console.error('Error rechazando solicitud:', error);
          toast.error('Error al rechazar solicitud');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const handleDelete = (requestId) => {
    if (!canManage) {
      toast.error('No tienes permisos para eliminar solicitudes');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar solicitud',
      message: '¿Seguro que quieres eliminar esta solicitud? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await requestService.deleteRequest(requestId);
          toast.success('Solicitud eliminada');
          await loadRequests();
        } catch (error) {
          console.error('Error eliminando solicitud:', error);
          toast.error('Error al eliminar solicitud');
        }
      },
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending:  'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      approved: 'bg-green-500/10  text-green-500  border-green-500/30',
      rejected: 'bg-red-500/10    text-red-500    border-red-500/30'
    };
    const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
    const icons  = {
      pending:  <FaClock />,
      approved: <FaCheckCircle />,
      rejected: <FaTimesCircle />
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  const stats = useMemo(() => ({
    pending:  requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length
  }), [requests]);

  return (
    <div className="px-4 py-6 space-y-6">

      {/* ENCABEZADO */}
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
            Revisa y aprueba solicitudes de nuevos usuarios
          </p>
        </div>
      </motion.div>

      {/* ESTADÍSTICAS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <FaClock className="text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <FaCheckCircle className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Aprobadas</p>
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <FaTimesCircle className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Rechazadas</p>
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FILTROS DE ESTADO */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'pending',  label: 'Pendientes' },
          { value: 'approved', label: 'Aprobadas'  },
          { value: 'rejected', label: 'Rechazadas' },
          { value: 'all',      label: 'Todas'      },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filter === value
                ? 'bg-primary text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* LISTADO */}
      {loading ? (
        <div className="card-soft py-16 text-center">
          <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="card-soft py-16 px-6 text-center border border-dashed border-slate-700">
          <FaExclamationTriangle className="text-slate-600 text-5xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-light mb-2">No hay solicitudes</h2>
          <p className="text-slate-400">No se encontraron solicitudes con este filtro</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-soft p-5 border border-slate-800 hover:border-primary/50 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xl font-bold text-primary">
                      {(request.name?.charAt?.(0) || 'U').toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-light font-bold text-lg">{request.name}</h3>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <FaEnvelope className="flex-shrink-0" />
                          <span>{request.email}</span>
                        </div>
                        {request.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <FaPhone className="flex-shrink-0" />
                            <span>{request.phone}</span>
                          </div>
                        )}
                      </div>

                      {request.message && (
                        <p className="text-slate-300 text-sm mt-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                          {request.message}
                        </p>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        Solicitado el {request.createdAt?.toLocaleDateString?.()} a las{' '}
                        {request.createdAt?.toLocaleTimeString?.()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ✅ Botones aprobar/rechazar — solo si canManage */}
                {canManage && request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveClick(request)}
                      disabled={processingId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                    >
                      {processingId === request.id ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaCheckCircle />
                      )}
                      Aprobar
                    </button>

                    <button
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                    >
                      <FaTimesCircle />
                      Rechazar
                    </button>
                  </div>
                )}

                {/* ✅ Botón eliminar — solo si canManage y no pendiente */}
                {canManage && request.status !== 'pending' && (
                  <button
                    onClick={() => handleDelete(request.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-sm transition-all"
                  >
                    <FaTrash />
                    Eliminar
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL APROBAR */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-soft max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">Aprobar solicitud</h2>

            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Usuario: <span className="font-bold text-light">{selectedRequest.name}</span>
              </p>
              <p className="text-slate-300 mb-4">
                Email: <span className="font-bold text-light">{selectedRequest.email}</span>
              </p>

              <label className="block text-sm text-slate-300 mb-2">
                Asignar rol <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {Object.entries(USER_ROLE_LABELS).map(([roleKey, label]) => (
                  <option key={roleKey} value={roleKey}>{label}</option>
                ))}
              </select>

              <p className="text-xs text-slate-400 mt-2">
                Se creará la cuenta y se enviará un email para establecer contraseña
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={!!processingId}
                className="flex-1 button-gold disabled:opacity-50"
              >
                {processingId ? 'Procesando...' : 'Confirmar aprobación'}
              </button>
              <button
                onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ConfirmModal rechazar / eliminar */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        confirmText="Sí, confirmar"
      />
    </div>
  );
};

export default RequestsPage;