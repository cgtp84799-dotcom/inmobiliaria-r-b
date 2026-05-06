// src/modules/clients/pages/ClientManagement.jsx
//
// Página de gestión de clientes para staff. handleDelete delega en
// userService.deleteUser() (Cloud Function con Admin SDK) en lugar de
// borrar /users/{email} directamente, y verifica que no sea
// auto-eliminación antes de proceder.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaSearch, FaUser, FaEdit, FaTrash,
  FaPhone, FaEnvelope, FaSpinner, FaWhatsapp,
  FaTimes, FaFilter, FaCalendarCheck, FaUsers,
  FaFileContract, FaHistory, FaTable, FaTh,
  FaChevronLeft, FaChevronRight, FaMobileAlt,
  FaHeart, FaChartBar, FaGlobe,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
  getDocs, limit, where,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { hasPermission } from '../../users/types/user.types';
import { userService } from '../../users/services/user.service';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';
import ClientDetail from '../components/ClientDetail';
import { formatCOP } from '../../../shared/utils/formatCurrency';

// ── Badges ────────────────────────────────────────────────────────────────────
const TipoBadge = ({ tipo }) => {
  const s = {
    Lead: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Comprador: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Arrendatario: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Propietario: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    portal: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${s[tipo] || s.Lead}`}>{tipo}</span>;
};

const EstadoBadge = ({ estado }) => {
  const norm = estado?.toLowerCase();
  const s = {
    activo:     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    inactivo:   'bg-slate-500/20 text-[var(--color-text-muted)] border-slate-500/30',
    convertido: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${s[norm] || s.activo}`}>{estado}</span>;
};

const PortalBadge = () => (
  <span title="Cliente con cuenta en el portal" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
    <FaMobileAlt size={8} /> Portal
  </span>
);

// ── Métricas del header ───────────────────────────────────────────────────────
function ClientMetrics({ clients }) {
  const total    = clients.length;
  const portal   = clients.filter((c) => c.createdViaPortal || c.tipoCliente === 'portal').length;
  const leads    = clients.filter((c) => c.tipoCliente === 'Lead').length;
  const activos  = clients.filter((c) => ['activo', 'Activo'].includes(c.estado)).length;

  const metrics = [
    { label: 'Total',    value: total,   color: 'text-[var(--color-text)]',        icon: FaUsers        },
    { label: 'Activos',  value: activos, color: 'text-emerald-400',  icon: FaChartBar     },
    { label: 'Portal',   value: portal,  color: 'text-amber-400',    icon: FaGlobe        },
    { label: 'Leads',    value: leads,   color: 'text-yellow-400',   icon: FaUser         },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
            <Icon className={`${color} text-xs`} />
          </div>
          <div>
            <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Modal agendar visita — escribe en /visits ────────────────────────────────
function ScheduleVisitModal({ client, onClose }) {
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    propertyId: client?.propiedadVinculada || '',
    date: '',
    time: '10:00',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'properties'), orderBy('title'), limit(100)))
      .then((s) => setProperties(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) { toast.error('Selecciona una fecha'); return; }
    setSaving(true);
    try {
      const prop = properties.find((p) => p.id === form.propertyId);
      await addDoc(collection(db, 'visits'), {
        clientId:        client.id,
        clientName:      client.nombre,
        clientPhone:     client.telefono  || '',
        clientEmail:     client.email     || '',
        propertyId:      form.propertyId  || null,
        propertyName:    prop?.title      || 'Sin propiedad específica',
        propertyAddress: prop?.address    || prop?.city || '',
        requestedDate:   form.date,
        requestedTime:   form.time,
        agentId:         currentUser?.uid   || '',
        agentName:       currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
        agentEmail:      currentUser?.email  || '',
        status:          'approved',
        notes:           form.notes,
        scheduledByAgent: true,
        privacyAccepted:  true,
        createdAt:        serverTimestamp(),
        updatedAt:        serverTimestamp(),
      });
      toast.success('Visita agendada correctamente ✓');
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[var(--color-text)] font-bold flex items-center gap-2">
            <FaCalendarCheck className="text-primary" /> Agendar visita
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <FaTimes size={13} />
          </button>
        </div>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          Cliente: <span className="text-[var(--color-text)] font-semibold">{client?.nombre}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Propiedad</label>
            <select
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none"
            >
              <option value="">Sin propiedad específica</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title} – {p.city || ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Fecha *</label>
              <input
                type="date"
                required
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Hora</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Notas</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Instrucciones, observaciones..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary outline-none resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-input-bg)] text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Agendar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Modal agregar actividad ───────────────────────────────────────────────────
function AddActivityModal({ client, onClose }) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    type: 'llamada',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.notes.trim()) { toast.error('Escribe una nota'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'clients', client.id, 'history'), {
        type: form.type,
        notes: form.notes,
        date: form.date,
        time: form.time,
        agentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
        agentId: currentUser?.uid || '',
        createdAt: serverTimestamp(),
      });
      toast.success('Actividad registrada ✓');
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--color-text)] font-bold flex items-center gap-2">
            <FaPlus className="text-primary" /> Nueva actividad
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <FaTimes size={13} />
          </button>
        </div>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          Cliente: <span className="text-[var(--color-text)] font-semibold">{client?.nombre}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none"
            >
              <option value="llamada">📞 Llamada</option>
              <option value="reunion">🤝 Reunión</option>
              <option value="seguimiento">👥 Seguimiento</option>
              <option value="visita">🏠 Visita</option>
              <option value="otro">📌 Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Hora</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Notas *</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="¿Qué se trató? ¿Cuáles son los siguientes pasos?"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary outline-none resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-input-bg)] text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Registrar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientManagement() {
  const { currentUser, userData } = useAuth();

  const canCreate = hasPermission(userData?.role, 'clients', 'create');
  const canUpdate = hasPermission(userData?.role, 'clients', 'update');
  const canDelete = hasPermission(userData?.role, 'clients', 'delete');

  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState('table');

  const [showForm,   setShowForm]   = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData,   setFormData]   = useState({
    nombre: '', telefono: '', email: '',
    tipoCliente: 'Lead', estado: 'Activo',
    presupuesto: '', tipoPropiedad: '',
    ubicacionInteres: '', notas: '', propiedadVinculada: '',
  });

  const [detailClient,   setDetailClient]   = useState(null);
  const [visitClient,    setVisitClient]    = useState(null);
  const [activityClient, setActivityClient] = useState(null);
  const [confirmModal,   setConfirmModal]   = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [search,       setSearch]       = useState('');
  const [filterTipo,   setFilterTipo]   = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPortal, setFilterPortal] = useState('');
  const [showFilters,  setShowFilters]  = useState(false);
  const [page,         setPage]         = useState(1);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
      (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error('ClientManagement snapshot:', err); setLoading(false); }
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    let r = [...clients];
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter((c) =>
        c.nombre?.toLowerCase().includes(t) ||
        c.email?.toLowerCase().includes(t)  ||
        c.telefono?.includes(search)
      );
    }
    if (filterTipo)   r = r.filter((c) => c.tipoCliente === filterTipo);
    if (filterEstado) r = r.filter((c) => c.estado?.toLowerCase() === filterEstado.toLowerCase());
    if (filterPortal === 'portal')    r = r.filter((c) => c.createdViaPortal || c.tipoCliente === 'portal');
    if (filterPortal === 'no-portal') r = r.filter((c) => !c.createdViaPortal && c.tipoCliente !== 'portal');
    return r;
  }, [clients, search, filterTipo, filterEstado, filterPortal]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  //   - Tiene protección contra auto-eliminación
  //   - Maneja Cloud Function + fallback de forma segura
  //   - NO elimina directamente /users/{email} de forma insegura
  const handleDelete = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    const isPortalClient = client?.createdViaPortal || client?.tipoCliente === 'portal';
    if (client?.email && currentUser?.email &&
        client.email.toLowerCase() === currentUser.email.toLowerCase()) {
      toast.error('No puedes eliminar tu propia cuenta.');
      return;
    }

    const message = isPortalClient
      ? `¿Eliminar este cliente del portal?\n\nEsto eliminará:\n• Su perfil de cliente\n• Su acceso al portal\n• Su historial de favoritos\n\nEsta acción es permanente.`
      : '¿Seguro que deseas eliminar este cliente? Esta acción es permanente.';

    setConfirmModal({
      isOpen: true,
      title: isPortalClient ? 'Eliminar cliente del portal' : 'Eliminar cliente',
      message,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        try {
          // 1. Eliminar doc de /clients
          await deleteDoc(doc(db, 'clients', clientId));

          // 2. Si es cliente del portal, eliminar su cuenta completa
          //    usando userService que maneja todo de forma segura
          if (isPortalClient && client?.email) {
            try {
              await userService.deleteUser(client.email, 'viewer');
            } catch (e) {
              // No bloquear si falla — el doc de /clients ya se eliminó
              console.warn('Error eliminando usuario del portal:', e.message);
            }
          }

          toast.success(isPortalClient ? 'Cliente eliminado del portal y del sistema' : 'Cliente eliminado');
          if (detailClient?.id === clientId) setDetailClient(null);
        } catch (err) {
          toast.error(`Error: ${err.message}`);
        }
      },
    });
  };

  const handleEdit = (client) => {
    setEditClient(client);
    setFormData({
      nombre: client.nombre || '', telefono: client.telefono || '', email: client.email || '',
      tipoCliente: client.tipoCliente || 'Lead', estado: client.estado || 'Activo',
      presupuesto: client.presupuesto || '', tipoPropiedad: client.tipoPropiedad || '',
      ubicacionInteres: client.ubicacionInteres || '', notas: client.notas || '',
      propiedadVinculada: client.propiedadVinculada || '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false); setEditClient(null);
    setFormData({
      nombre: '', telefono: '', email: '', tipoCliente: 'Lead', estado: 'Activo',
      presupuesto: '', tipoPropiedad: '', ubicacionInteres: '', notas: '', propiedadVinculada: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSubmitting(true);
    try {
      if (editClient) {
        await updateDoc(doc(db, 'clients', editClient.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        toast.success('Cliente actualizado ✓');
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          createdViaPortal: false,
          onboardingDone:   true,
          createdAt:        serverTimestamp(),
          updatedAt:        serverTimestamp(),
        });
        toast.success('Cliente creado ✓');
      }
      handleCloseForm();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none transition-colors';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FaSpinner className="animate-spin text-3xl text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-light">
            Clientes <span className="text-[var(--color-text-muted)] text-lg font-normal">({filtered.length})</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Gestión completa de clientes del panel y del portal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="p-2.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-input-bg)] transition-colors border border-[var(--color-border)]"
          >
            {viewMode === 'table' ? <FaTh size={14} /> : <FaTable size={14} />}
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-sm font-semibold transition-colors"
          >
            <FaFilter size={12} /> Filtros
          </button>
          {canCreate && (
            <button
              onClick={() => { setShowForm(true); setEditClient(null); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <FaPlus size={12} /> Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <ClientMetrics clients={clients} />

      {/* Filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--color-surface)]/60 border border-[var(--color-border)] rounded-2xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative lg:col-span-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, teléfono..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] focus:border-primary outline-none"
                />
              </div>
              <select
                value={filterTipo}
                onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
                className={inputCls}
              >
                <option value="">Todos los tipos</option>
                <option value="Lead">Lead</option>
                <option value="Comprador">Comprador</option>
                <option value="Arrendatario">Arrendatario</option>
                <option value="Propietario">Propietario</option>
                <option value="portal">Portal</option>
              </select>
              <select
                value={filterEstado}
                onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
                className={inputCls}
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="convertido">Convertido</option>
              </select>
              <select
                value={filterPortal}
                onChange={(e) => { setFilterPortal(e.target.value); setPage(1); }}
                className={inputCls}
              >
                <option value="">Todos (portal y no portal)</option>
                <option value="portal">Solo portal</option>
                <option value="no-portal">Solo sin portal</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 card-soft">
          <FaUsers className="text-[var(--color-text-faint)] text-4xl mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-semibold">No se encontraron clientes</p>
          <p className="text-[var(--color-text-faint)] text-sm mt-1">Ajusta los filtros o crea un nuevo cliente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {viewMode === 'table' && (
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              <span>Cliente</span>
              <span>Contacto</span>
              <span>Tipo</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
          )}

          {paginated.map((client) => {
            const isPortal    = client.createdViaPortal || client.tipoCliente === 'portal';
            const isSelected  = detailClient?.id === client.id;
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`bg-[var(--color-surface)]/60 border rounded-xl hover:border-[var(--color-border)] transition-colors ${
                  isSelected ? 'border-primary/40 ring-1 ring-primary/20' : 'border-[var(--color-border)]/60'
                }`}
              >
                {viewMode === 'table' ? (
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 items-center p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {(client.nombre || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[var(--color-text)] text-sm font-semibold truncate">{client.nombre}</p>
                          {isPortal && <PortalBadge />}
                        </div>
                        {client.email && <p className="text-[var(--color-text-muted)] text-xs truncate">{client.email}</p>}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {client.telefono && (
                        <p className="text-[var(--color-text-muted)] text-xs flex items-center gap-1.5">
                          <FaPhone className="text-[10px] text-[var(--color-text-faint)]" /> {client.telefono}
                        </p>
                      )}
                      {client.email && (
                        <p className="text-[var(--color-text-muted)] text-xs flex items-center gap-1.5">
                          <FaEnvelope className="text-[10px] text-[var(--color-text-faint)]" /> {client.email}
                        </p>
                      )}
                    </div>
                    <div><TipoBadge tipo={client.tipoCliente || 'Lead'} /></div>
                    <div><EstadoBadge estado={client.estado || 'Activo'} /></div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDetailClient(isSelected ? null : client)}
                        className={`p-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'text-primary bg-primary/10'
                            : 'text-[var(--color-text-muted)] hover:text-primary hover:bg-primary/10'
                        }`}
                        title="Ver detalle"
                      >
                        <FaUser size={12} />
                      </button>
                      {client.telefono && (
                        <a
                          href={`https://wa.me/57${client.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="WhatsApp"
                        >
                          <FaWhatsapp size={12} />
                        </a>
                      )}
                      <button
                        onClick={() => setVisitClient(client)}
                        className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Agendar visita"
                      >
                        <FaCalendarCheck size={12} />
                      </button>
                      <button
                        onClick={() => setActivityClient(client)}
                        className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Agregar actividad"
                      >
                        <FaHistory size={12} />
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-input-bg)] transition-colors"
                          title="Editar"
                        >
                          <FaEdit size={12} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {(client.nombre || 'C')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[var(--color-text)] font-semibold truncate">{client.nombre}</p>
                            {isPortal && <PortalBadge />}
                          </div>
                          {client.email && <p className="text-[var(--color-text-muted)] text-xs truncate">{client.email}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <TipoBadge tipo={client.tipoCliente || 'Lead'} />
                        <EstadoBadge estado={client.estado || 'Activo'} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {client.telefono && (
                        <p className="text-[var(--color-text-muted)] text-xs flex items-center gap-1.5">
                          <FaPhone className="text-[10px]" /> {client.telefono}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => setDetailClient(isSelected ? null : client)}
                          className={`p-2 rounded-lg transition-colors ${isSelected ? 'text-primary bg-primary/10' : 'text-[var(--color-text-muted)] hover:text-primary hover:bg-primary/10'}`}
                        >
                          <FaUser size={12} />
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-input-bg)] transition-colors"
                          >
                            <FaEdit size={12} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[var(--color-text-muted)] text-sm">
            Página {page} de {totalPages} · {filtered.length} clientes
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[var(--color-border)]"
            >
              <FaChevronLeft size={12} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[var(--color-border)]"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── SLIDE-OVER panel de detalle ── */}
      <AnimatePresence>
        {detailClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setDetailClient(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[460px] bg-[var(--color-bg)] border-l border-[var(--color-border)] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 flex flex-col gap-4 min-h-full">
                <ClientDetail
                  client={detailClient}
                  onClose={() => setDetailClient(null)}
                  onEdit={canUpdate ? handleEdit : null}
                  onDelete={canDelete ? handleDelete : null}
                  onScheduleVisit={(c) => setVisitClient(c)}
                  onAddActivity={(c) => setActivityClient(c)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modales */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/85"
            onClick={handleCloseForm}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[var(--color-text)] font-bold text-lg">
                  {editClient ? 'Editar cliente' : 'Nuevo cliente'}
                </h3>
                <button onClick={handleCloseForm} className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                  <FaTimes size={14} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Nombre completo *</label>
                    <input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Juan García" className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Teléfono</label>
                    <input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} placeholder="310 000 0000" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="cliente@email.com" className={inputCls} disabled={!!editClient} />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Tipo de cliente</label>
                    <select value={formData.tipoCliente} onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })} className={inputCls}>
                      <option value="Lead">Lead</option>
                      <option value="Comprador">Comprador</option>
                      <option value="Arrendatario">Arrendatario</option>
                      <option value="Propietario">Propietario</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Estado</label>
                    <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className={inputCls}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Convertido">Convertido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Presupuesto</label>
                    <input value={formData.presupuesto} onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })} placeholder="500.000.000" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Tipo de propiedad</label>
                    <select value={formData.tipoPropiedad} onChange={(e) => setFormData({ ...formData, tipoPropiedad: e.target.value })} className={inputCls}>
                      <option value="">Sin preferencia</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Local">Local</option>
                      <option value="Lote">Lote</option>
                      <option value="Finca">Finca</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Zona de interés</label>
                    <input value={formData.ubicacionInteres} onChange={(e) => setFormData({ ...formData, ubicacionInteres: e.target.value })} placeholder="Ej: Laureles, El Poblado" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[var(--color-text-muted)] text-xs font-semibold mb-1.5">Notas internas</label>
                    <textarea rows={3} value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observaciones, preferencias especiales..." className={`${inputCls} resize-none`} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleCloseForm} className="flex-1 py-2.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-input-bg)] text-sm font-semibold transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {submitting ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : editClient ? 'Guardar cambios' : 'Crear cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visitClient && <ScheduleVisitModal client={visitClient} onClose={() => setVisitClient(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {activityClient && <AddActivityModal client={activityClient} onClose={() => setActivityClient(null)} />}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Sí, eliminar definitivamente"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}