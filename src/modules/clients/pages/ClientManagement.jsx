// src/modules/clients/pages/ClientManagement.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaSearch, FaUser, FaEdit, FaTrash,
  FaPhone, FaEnvelope, FaSpinner, FaWhatsapp,
  FaTimes, FaFilter, FaCalendarCheck, FaUsers,
  FaFileContract, FaHistory, FaTable, FaTh,
  FaChevronLeft, FaChevronRight, FaMobileAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
  getDocs, limit,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { hasPermission } from '../../users/types/user.types';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';
import ClientDetail from '../components/ClientDetail';
import { formatCOP } from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';
import { parseISO, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const s = {
    Activo: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    activo: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Inactivo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    Convertido: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${s[estado] || s.Activo}`}>{estado}</span>;
};

/** Badge de Portal — visible cuando el cliente tiene cuenta en el portal */
const PortalBadge = () => (
  <span
    title="Cliente con cuenta en el portal"
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20"
  >
    <FaMobileAlt size={8} /> Portal
  </span>
);

// ── Modal agendar visita ──────────────────────────────────────────────────────
function ScheduleVisitModal({ client, onClose }) {
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    propertyId: client?.propiedadVinculada || '',
    date: '', time: '10:00', notes: '',
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
      await addDoc(collection(db, 'appointments'), {
        clientId:        client.id,
        clientName:      client.nombre,
        clientPhone:     client.telefono || '',
        clientEmail:     client.email    || '',
        propertyId:      form.propertyId || '',
        propertyName:    prop?.title  || '',
        propertyAddress: prop?.address || prop?.city || '',
        date:            form.date,
        time:            form.time,
        notes:           form.notes,
        status:          'pendiente',
        type:            'visita',
        assignedAgentId: currentUser?.uid || '',
        agentName:       currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
        agentEmail:      currentUser?.email || '',
        createdAt:       serverTimestamp(),
        updatedAt:       serverTimestamp(),
      });
      toast.success('Visita agendada correctamente ✓');
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FaCalendarCheck className="text-primary" /> Agendar visita
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <FaTimes size={13} />
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-4">Cliente: <span className="text-white font-semibold">{client?.nombre}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5">Propiedad</label>
            <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none">
              <option value="">Sin propiedad específica</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title} – {p.city || ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Fecha *</label>
              <input type="date" required value={form.date} min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Hora</label>
              <input type="time" value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5">Notas</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Instrucciones, observaciones..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
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
    type: 'llamada', notes: '',
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
        type:      form.type,
        notes:     form.notes,
        date:      form.date,
        time:      form.time,
        agentName: currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
        agentId:   currentUser?.uid || '',
        createdAt: serverTimestamp(),
      });
      toast.success('Actividad registrada ✓');
      onClose();
    } catch (err) { toast.error(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FaPlus className="text-primary" /> Nueva actividad
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <FaTimes size={13} />
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-4">Cliente: <span className="text-white font-semibold">{client?.nombre}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5">Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none">
              <option value="llamada">📞 Llamada</option>
              <option value="reunion">🤝 Reunión</option>
              <option value="seguimiento">👥 Seguimiento</option>
              <option value="visita">🏠 Visita</option>
              <option value="otro">📌 Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Hora</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5">Nota *</label>
            <textarea rows={4} required value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="¿Qué ocurrió en esta interacción?"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
const PAGE_SIZE = 15;

export default function ClientManagement() {
  const { currentUser } = useAuth();
  const canCreate = hasPermission(currentUser?.role, 'clients', 'create');
  const canUpdate = hasPermission(currentUser?.role, 'clients', 'update');
  const canDelete = hasPermission(currentUser?.role, 'clients', 'delete');

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
  const [filterPortal, setFilterPortal] = useState(''); // '' | 'portal' | 'no-portal'
  const [showFilters,  setShowFilters]  = useState(false);
  const [page,         setPage]         = useState(1);

  // ── Listener en tiempo real ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
      (s) => { setClients(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error('[ClientManagement]', err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // ── Filtrado en memoria ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filterTipo   && c.tipoCliente !== filterTipo)   return false;
      if (filterEstado && c.estado      !== filterEstado) return false;
      if (filterPortal === 'portal'    && !c.createdViaPortal) return false;
      if (filterPortal === 'no-portal' &&  c.createdViaPortal) return false;
      if (q && !(
        c.nombre?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)  ||
        c.telefono?.includes(q)
      )) return false;
      return true;
    });
  }, [clients, search, filterTipo, filterEstado, filterPortal]);

  // KPIs
  const kpis = useMemo(() => ({
    total:      clients.length,
    activos:    clients.filter((c) => c.estado === 'Activo' || c.estado === 'activo').length,
    leads:      clients.filter((c) => c.tipoCliente === 'Lead').length,
    portal:     clients.filter((c) => c.createdViaPortal).length,
    convertidos:clients.filter((c) => c.estado === 'Convertido').length,
  }), [clients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = filterTipo || filterEstado || filterPortal;

  // ── Guardar cliente ────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim())   { toast.error('El nombre es obligatorio');   return; }
    if (!formData.telefono.trim()) { toast.error('El teléfono es obligatorio'); return; }
    setSubmitting(true);
    try {
      if (editClient) {
        await updateDoc(doc(db, 'clients', editClient.id), { ...formData, updatedAt: serverTimestamp() });
        toast.success('Cliente actualizado ✓');
        if (detailClient?.id === editClient.id) setDetailClient((prev) => ({ ...prev, ...formData }));
      } else {
        await addDoc(collection(db, 'clients'), { ...formData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast.success('Cliente creado ✓');
      }
      handleCloseForm();
    } catch (err) { toast.error(`Error: ${err.message}`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (clientId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar cliente',
      message: '¿Seguro que deseas eliminar este cliente? Esta acción es permanente.',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'clients', clientId));
          toast.success('Cliente eliminado');
          if (detailClient?.id === clientId) setDetailClient(null);
        } catch (err) { toast.error(`Error: ${err.message}`); }
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
    setFormData({ nombre: '', telefono: '', email: '', tipoCliente: 'Lead', estado: 'Activo',
      presupuesto: '', tipoPropiedad: '', ubicacionInteres: '', notas: '', propiedadVinculada: '' });
  };

  const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none transition-colors';

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            CRM · Clientes
          </h1>
          <p className="text-slate-400 text-sm">{clients.length} clientes registrados</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-slate-950 font-semibold text-sm hover:bg-primary/90 transition-colors">
            <FaPlus size={12} /> Nuevo cliente
          </button>
        )}
      </div>

      {/* ── KPIs — ahora incluye Portal ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: kpis.total,       color: 'text-white' },
          { label: 'Activos',     value: kpis.activos,     color: 'text-emerald-400' },
          { label: 'Leads',       value: kpis.leads,       color: 'text-yellow-400' },
          { label: 'Convertidos', value: kpis.convertidos, color: 'text-blue-400' },
          { label: 'En portal',   value: kpis.portal,      color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Barra búsqueda + filtros ─────────────────────────────────────── */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
          <input type="text" placeholder="Buscar nombre, email o teléfono..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-primary outline-none transition-colors" />
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${hasFilters ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
          <FaFilter size={11} /> Filtros
          {hasFilters && (
            <span className="w-5 h-5 rounded-full bg-primary text-slate-950 text-xs font-bold flex items-center justify-center">
              {[filterTipo, filterEstado, filterPortal].filter(Boolean).length}
            </span>
          )}
        </button>
        <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <FaTable size={11} />
          </button>
          <button onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <FaTh size={11} />
          </button>
        </div>
      </div>

      {/* Filtros expandibles */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Tipo de cliente</label>
                <select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }} className={inputCls}>
                  <option value="">Todos</option>
                  <option value="Lead">Lead</option>
                  <option value="Comprador">Comprador</option>
                  <option value="Arrendatario">Arrendatario</option>
                  <option value="Propietario">Propietario</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Estado</label>
                <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }} className={inputCls}>
                  <option value="">Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Convertido">Convertido</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">Portal</label>
                <select value={filterPortal} onChange={(e) => { setFilterPortal(e.target.value); setPage(1); }} className={inputCls}>
                  <option value="">Todos</option>
                  <option value="portal">Con cuenta en portal</option>
                  <option value="no-portal">Sin cuenta en portal</option>
                </select>
              </div>
              {hasFilters && (
                <div className="sm:col-span-3 flex justify-end">
                  <button onClick={() => { setFilterTipo(''); setFilterEstado(''); setFilterPortal(''); }}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1">
                    <FaTimes size={10} /> Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="text-sm">Cargando clientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <FaUsers size={40} className="opacity-30" />
          <p className="text-sm">{search || hasFilters ? 'Sin resultados' : 'No hay clientes registrados'}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── Vista tabla ── */
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                {['Cliente', 'Contacto', 'Tipo / Estado', 'Portal', 'Presupuesto', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginated.map((c) => (
                <motion.tr key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  onClick={() => setDetailClient(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <FaUser className="text-primary" size={12} />
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">{c.nombre}</p>
                        <p className="text-slate-500 text-xs truncate max-w-[120px]">{c.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.telefono && (
                      <a href={`https://wa.me/57${(c.telefono).replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors text-xs"
                        title="WhatsApp">
                        <FaWhatsapp size={11} /> {c.telefono}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TipoBadge  tipo={c.tipoCliente} />
                      <EstadoBadge estado={c.estado} />
                    </div>
                  </td>
                  {/* ─ Columna Portal (NUEVA) ─ */}
                  <td className="px-4 py-3">
                    {c.createdViaPortal && <PortalBadge />}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-slate-300 text-xs">{c.presupuesto ? formatCOP(c.presupuesto) : '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setVisitClient(c)}
                        className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-400 transition-colors" title="Agendar visita">
                        <FaCalendarCheck size={11} />
                      </button>
                      {canUpdate && (
                        <button onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Editar">
                          <FaEdit size={11} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="Eliminar">
                          <FaTrash size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Vista cards ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors cursor-pointer"
              onClick={() => setDetailClient(c)}>
              <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white text-sm font-bold">{c.nombre}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                      <TipoBadge tipo={c.tipoCliente} />
                      <EstadoBadge estado={c.estado} />
                      {/* Badge Portal en card (NUEVO) */}
                      {c.createdViaPortal && <PortalBadge />}
                    </div>
                  </div>
                </div>
                {c.telefono && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <FaPhone className="text-primary" size={10} /> {c.telefono}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 truncate">
                    <FaEnvelope className="text-primary" size={10} /> {c.email}
                  </div>
                )}
                {c.presupuesto && (
                  <p className="text-primary text-xs font-bold mt-2">{formatCOP(c.presupuesto)}</p>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setVisitClient(c)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-yellow-300 border border-yellow-600/40 hover:bg-yellow-500/10 transition-colors">
                    Visita
                  </button>
                  <a href={`https://wa.me/57${(c.telefono || '').replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center text-green-300 border border-green-600/40 hover:bg-green-500/10 transition-colors">
                    WA
                  </a>
                  {canUpdate && (
                    <button onClick={() => handleEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                      <FaEdit size={11} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Paginación ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 disabled:opacity-40 hover:border-primary/40 transition text-sm inline-flex items-center gap-1.5 bg-slate-900">
            <FaChevronLeft size={10} /> Anterior
          </button>
          <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 disabled:opacity-40 hover:border-primary/40 transition text-sm inline-flex items-center gap-1.5 bg-slate-900">
            Siguiente <FaChevronRight size={10} />
          </button>
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <p className="text-slate-600 text-xs text-center">
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Drawer detalle ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDetailClient(null); }}>
            <motion.div
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              className="bg-slate-950 border-l border-slate-800 h-full w-full sm:w-[420px] overflow-y-auto p-5">
              <ClientDetail
                client={detailClient}
                onClose={() => setDetailClient(null)}
                onEdit={() => { handleEdit(detailClient); setDetailClient(null); }}
                onScheduleVisit={() => { setVisitClient(detailClient); setDetailClient(null); }}
                onAddActivity={() => setActivityClient(detailClient)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal formulario ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/85"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSave} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-bold text-lg">
                    {editClient ? 'Editar cliente' : 'Nuevo cliente'}
                  </h2>
                  <button type="button" onClick={handleCloseForm}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <FaTimes size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Nombre completo *</label>
                    <input type="text" required value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className={inputCls} placeholder="Ej: Juan Pérez" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Teléfono *</label>
                    <input type="tel" required value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className={inputCls} placeholder="3001234567" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Email</label>
                    <input type="email" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputCls} placeholder="correo@ejemplo.com" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Tipo *</label>
                    <select required value={formData.tipoCliente}
                      onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })}
                      className={inputCls}>
                      <option value="Lead">Lead</option>
                      <option value="Comprador">Comprador</option>
                      <option value="Arrendatario">Arrendatario</option>
                      <option value="Propietario">Propietario</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Estado</label>
                    <select value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className={inputCls}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Convertido">Convertido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Presupuesto (COP)</label>
                    <input type="number" value={formData.presupuesto}
                      onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })}
                      className={inputCls} placeholder="50000000" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Tipo de propiedad de interés</label>
                    <select value={formData.tipoPropiedad}
                      onChange={(e) => setFormData({ ...formData, tipoPropiedad: e.target.value })}
                      className={inputCls}>
                      <option value="">Sin especificar</option>
                      <option value="Casa">Casa</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Local">Local</option>
                      <option value="Lote">Lote</option>
                      <option value="Finca">Finca</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Ubicación de interés</label>
                    <input type="text" value={formData.ubicacionInteres}
                      onChange={(e) => setFormData({ ...formData, ubicacionInteres: e.target.value })}
                      className={inputCls} placeholder="Ej: Anserma, Centro" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">Notas</label>
                    <textarea rows={3} value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      className={`${inputCls} resize-none`}
                      placeholder="Observaciones, preferencias, información relevante..." />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={handleCloseForm} disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {submitting
                      ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</>
                      : (editClient ? 'Actualizar' : 'Crear cliente')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modales auxiliares ───────────────────────────────────────────── */}
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
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}