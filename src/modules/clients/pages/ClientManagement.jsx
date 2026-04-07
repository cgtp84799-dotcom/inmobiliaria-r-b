import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaSearch, FaUser, FaEdit, FaTrash,
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaDollarSign, FaHome,
  FaExclamationTriangle, FaSpinner, FaEye, FaWhatsapp,
  FaStickyNote, FaTimes, FaClock, FaCheckCircle, FaCalendarAlt,
  FaUsers, FaClipboardList, FaBan, FaUserTie,
  FaChevronLeft, FaChevronRight, FaFileContract, FaCalendarCheck,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, getDoc, getDocs,
  orderBy, limit, startAfter, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../../core/contexts/AuthContext';
import { hasPermission } from '../../users/types/user.types';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';
import ContractStatusBadge from '../../contracts/components/ContractStatusBadge';
import ContractTypeBadge  from '../../contracts/components/ContractTypeBadge';
import { formatCOP }      from '../../../shared/utils/formatCurrency';
import { formatShort }    from '../../../shared/utils/formatDate';

const PAGE_SIZE = 12;

// ─── Badges ───────────────────────────────────────────────────────────────────
const TipoBadge = ({ tipo }) => {
  const styles = {
    Lead:         'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    lead:         'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Comprador:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Arrendatario: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Propietario:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return (
    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold border ${styles[tipo] || styles.Lead}`}>
      {tipo}
    </span>
  );
};

const EstadoBadge = ({ estado }) => {
  const styles = {
    Activo:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    active:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Inactivo:  'bg-slate-500/20 text-slate-400 border-slate-500/30',
    Convertido:'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };
  return (
    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold border ${styles[estado] || styles.Activo}`}>
      {estado}
    </span>
  );
};

// ─── Helpers actividad ────────────────────────────────────────────────────────
const getTypeIcon  = (t) => ({ visita: FaEye, reunion: FaUsers, llamada: FaPhone, seguimiento: FaClipboardList, otro: FaCalendarAlt }[t] || FaCalendarAlt);
const getTypeColor = (t) => ({ visita: 'text-blue-400', reunion: 'text-purple-400', llamada: 'text-emerald-400', seguimiento: 'text-orange-400', otro: 'text-slate-400' }[t] || 'text-slate-400');
const getStatusIcon  = (s) => ({ pendiente: FaClock, confirmada: FaCheckCircle, completada: FaCheckCircle, cancelada: FaBan }[s] || FaClock);
const getStatusColor = (s) => ({ pendiente: 'text-yellow-400', confirmada: 'text-blue-400', completada: 'text-emerald-400', cancelada: 'text-red-400' }[s] || 'text-yellow-400');

// ─── Pestaña contratos del cliente ────────────────────────────────────────────
const ClientContracts = ({ clientId }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    const q = query(
      collection(db, 'contracts'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [clientId]);

  if (loading) return (
    <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-yellow-400 text-2xl" /></div>
  );

  if (contracts.length === 0) return (
    <div className="py-10 text-center">
      <FaFileContract className="text-slate-600 text-4xl mx-auto mb-3" />
      <p className="text-slate-400 text-sm">No hay contratos registrados para este cliente</p>
      <p className="text-slate-500 text-xs mt-1">Los contratos vinculados aparecerán aquí</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {contracts.map((c) => (
        <div key={c.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 hover:border-yellow-500/30 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ContractTypeBadge type={c.type} />
              <ContractStatusBadge status={c.status} />
            </div>
            <p className="text-slate-400 text-xs whitespace-nowrap">{formatShort(c.startDate) || '—'}</p>
          </div>
          <p className="text-white text-sm font-semibold truncate mb-1">{c.propertyName || 'Propiedad sin nombre'}</p>
          {c.propertyAddress && <p className="text-slate-500 text-xs truncate mb-2">{c.propertyAddress}</p>}
          <div className="flex items-center justify-between">
            <p className="text-yellow-400 text-sm font-bold">{formatCOP(c.value)}</p>
            {c.agentName && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FaUserTie size={10} /> {c.agentName}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Mini modal agendar visita ─────────────────────────────────────────────────
const ScheduleVisitModal = ({ client, properties, onClose, onSaved }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    propertyId: client?.propiedadVinculada || '',
    date: '',
    time: '10:00',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) { toast.error('Selecciona una fecha'); return; }
    setSaving(true);
    try {
      const selectedProp = properties.find((p) => p.id === form.propertyId);
      await addDoc(collection(db, 'appointments'), {
        clientId:      client.id,
        clientName:    client.nombre,
        clientPhone:   client.telefono || '',
        clientEmail:   client.email || '',
        propertyId:    form.propertyId || '',
        propertyName:  selectedProp?.title || selectedProp?.name || '',
        propertyAddress: selectedProp?.location?.address || selectedProp?.address || '',
        date:          form.date,
        time:          form.time,
        notes:         form.notes,
        status:        'pendiente',
        type:          'visita',
        agentId:       currentUser?.uid || '',
        agentName:     currentUser?.displayName || currentUser?.email?.split('@')[0] || '',
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
      });
      toast.success('Visita agendada correctamente');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-700/60 p-6"
        style={{ backgroundColor: 'var(--color-card-bg, #1e1e1c)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FaCalendarCheck className="text-yellow-400" />
            Agendar visita
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <FaTimes size={14} />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Cliente: <span className="text-white font-semibold">{client?.nombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Propiedad</label>
            <select
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white border border-slate-600 focus:border-yellow-500 outline-none"
              style={{ backgroundColor: 'var(--color-input-bg, #141413)' }}
            >
              <option value="">Sin propiedad específica</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title || p.name} – {p.city || p.location?.city || ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Fecha <span className="text-red-400">*</span></label>
              <input
                type="date"
                required
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white border border-slate-600 focus:border-yellow-500 outline-none"
                style={{ backgroundColor: 'var(--color-input-bg, #141413)' }}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Hora</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white border border-slate-600 focus:border-yellow-500 outline-none"
                style={{ backgroundColor: 'var(--color-input-bg, #141413)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Notas</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Instrucciones, observaciones..."
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white border border-slate-600 focus:border-yellow-500 outline-none resize-none"
              style={{ backgroundColor: 'var(--color-input-bg, #141413)' }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><FaSpinner className="animate-spin" /> Guardando...</> : 'Agendar visita'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── Componente principal ──────────────────────────────────────────────────────
const ClientManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const canCreate = hasPermission(currentUser?.role, 'clients', 'create');
  const canUpdate = hasPermission(currentUser?.role, 'clients', 'update');
  const canDelete = hasPermission(currentUser?.role, 'clients', 'delete');

  const [clients, setClients]         = useState([]);
  const [properties, setProperties]   = useState([]);
  const [loading, setLoading]         = useState(true);

  const [showForm, setShowForm]               = useState(false);
  const [selectedClient, setSelectedClient]   = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [clientDetail, setClientDetail]       = useState(null);
  const [detailTab, setDetailTab]             = useState('actividad');

  const [clientEvents, setClientEvents]       = useState([]);
  const [loadingEvents, setLoadingEvents]     = useState(false);

  // Visit modal
  const [visitClient, setVisitClient] = useState(null);

  const [filtroTipo, setFiltroTipo]     = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda]         = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocs, setTotalDocs]     = useState(0);
  const [pageCursors, setPageCursors] = useState({});

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [formData, setFormData] = useState({
    nombre: '', telefono: '', email: '',
    tipoCliente: 'Lead', estado: 'Activo',
    presupuesto: '', tipoPropiedad: '',
    ubicacionInteres: '', notas: '', propiedadVinculada: '',
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((totalDocs || 0) / PAGE_SIZE)), [totalDocs]);

  const buildClientsBaseQuery = () => query(collection(db, 'clients'), orderBy('createdAt', 'desc'));

  const loadTotalClientsCount = async () => {
    try {
      const snap = await getCountFromServer(buildClientsBaseQuery());
      setTotalDocs(snap.data().count || 0);
    } catch { setTotalDocs(0); }
  };

  const hydrateCursorsUpTo = async (targetPage) => {
    for (let p = 1; p <= targetPage; p++) {
      if (pageCursors[p]) continue;
      const qBase = buildClientsBaseQuery();
      const qPage = p === 1
        ? query(qBase, limit(PAGE_SIZE))
        : pageCursors[p - 1] ? query(qBase, startAfter(pageCursors[p - 1]), limit(PAGE_SIZE)) : null;
      if (!qPage) break;
      const snap = await getDocs(qPage);
      setPageCursors((prev) => ({ ...prev, [p]: snap.docs[snap.docs.length - 1] || null }));
    }
  };

  const loadClientsPage = async (pageNumber) => {
    try {
      setLoading(true);
      const qBase = buildClientsBaseQuery();
      let qPage;
      if (pageNumber === 1) {
        qPage = query(qBase, limit(PAGE_SIZE));
      } else {
        if (!pageCursors[pageNumber - 1]) await hydrateCursorsUpTo(pageNumber - 1);
        const cursor = pageCursors[pageNumber - 1] || null;
        qPage = cursor ? query(qBase, startAfter(cursor), limit(PAGE_SIZE)) : query(qBase, limit(PAGE_SIZE));
      }
      const snapshot = await getDocs(qPage);
      const data = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          nombre:             d.nombre || d.name || '',
          telefono:           d.telefono || d.phone || '',
          email:              d.email || '',
          tipoCliente:        d.tipoCliente || d.type || 'Lead',
          estado:             d.estado || d.status || 'Activo',
          presupuesto:        d.presupuesto || d.budget || '',
          tipoPropiedad:      d.tipoPropiedad || d.propertyType || '',
          ubicacionInteres:   d.ubicacionInteres || d.location || '',
          notas:              d.notas || d.notes || '',
          propiedadVinculada: d.propiedadVinculada || d.linkedProperty || '',
          fechaRegistro:      d.fechaRegistro || d.createdAt || new Date().toISOString(),
          ...d,
        };
      });
      setPageCursors((prev) => ({ ...prev, [pageNumber]: snapshot.docs[snapshot.docs.length - 1] || null }));
      setClients(data);
      setCurrentPage(pageNumber);
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => { await loadTotalClientsCount(); await loadClientsPage(1); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar propiedades cuando se abra form O modal de visita
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!showForm && !visitClient) return;
      if (properties.length > 0) return; // ya cargadas
      try {
        const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(200));
        const snap = await getDocs(q);
        if (active) setProperties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {}
    };
    load();
    return () => { active = false; };
  }, [showForm, visitClient]);

  useEffect(() => {
    if (!clientDetail?.id) { setClientEvents([]); return; }
    setLoadingEvents(true);
    const q = query(collection(db, 'appointments'), where('clientId', '==', clientDetail.id));
    const unsub = onSnapshot(q, async (snap) => {
      const eventsData = await Promise.all(snap.docs.map(async (docSnap) => {
        const d = docSnap.data();
        const start = parseISO(`${d.date || new Date().toISOString().split('T')[0]}T${d.time || '09:00'}`);
        let agentName = d.agentName || '';
        if (!agentName) {
          const uid = d.assignedAgentId || d.createdBy || d.agentId;
          if (uid) {
            try {
              const uDoc = await getDoc(doc(db, 'users', uid));
              if (uDoc.exists()) {
                const u = uDoc.data();
                agentName = u.displayName || u.name || u.email || 'Agente';
              }
            } catch { agentName = 'Sin asignar'; }
          }
        }
        return { id: docSnap.id, ...d, start, agentName };
      }));
      eventsData.sort((a, b) => b.start - a.start);
      setClientEvents(eventsData);
      setLoadingEvents(false);
    }, () => { setClientEvents([]); setLoadingEvents(false); });
    return () => unsub();
  }, [clientDetail?.id]);

  const clientesFiltrados = useMemo(() => clients.filter((c) => {
    const term = busqueda.trim().toLowerCase();
    return (
      (filtroTipo   === 'Todos' || c.tipoCliente === filtroTipo) &&
      (filtroEstado === 'Todos' || c.estado      === filtroEstado) &&
      (!term || c.nombre?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term) || c.telefono?.includes(busqueda))
    );
  }), [clients, filtroTipo, filtroEstado, busqueda]);

  const pageButtons = useMemo(() => {
    const p = totalPages, c = currentPage;
    if (p <= 3) return Array.from({ length: p }, (_, i) => i + 1);
    let s = Math.max(1, c - 1), e = Math.min(p, s + 2);
    if (e - s < 2) s = Math.max(1, e - 2);
    return [s, s + 1, s + 2].filter((x) => x >= 1 && x <= p);
  }, [totalPages, currentPage]);

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim())   { toast.error('El nombre es obligatorio');   return; }
    if (!formData.telefono.trim()) { toast.error('El teléfono es obligatorio'); return; }
    setSubmitting(true);
    try {
      if (selectedClient) {
        await updateDoc(doc(db, 'clients', selectedClient.id), { ...formData, updatedAt: new Date().toISOString() });
        toast.success('Cliente actualizado correctamente');
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          fechaRegistro: new Date().toISOString(),
          createdAt:     new Date().toISOString(),
          updatedAt:     new Date().toISOString(),
        });
        toast.success('Cliente creado correctamente');
      }
      await loadTotalClientsCount();
      await loadClientsPage(currentPage);
      handleCloseForm();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = (clientId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar cliente',
      message: '¿Seguro que quieres eliminar este cliente? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'clients', clientId));
          toast.success('Cliente eliminado');
          await loadTotalClientsCount();
          await loadClientsPage(clients.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
        } catch (error) {
          toast.error(`Error: ${error.message}`);
        }
      },
    });
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormData({
      nombre: client.nombre || '', telefono: client.telefono || '',
      email: client.email || '', tipoCliente: client.tipoCliente || 'Lead',
      estado: client.estado || 'Activo', presupuesto: client.presupuesto || '',
      tipoPropiedad: client.tipoPropiedad || '',
      ubicacionInteres: client.ubicacionInteres || '',
      notas: client.notas || '', propiedadVinculada: client.propiedadVinculada || '',
    });
    setShowForm(true);
  };

  const handleViewDetail = (client) => {
    setClientDetail(client);
    setDetailTab('actividad');
    setShowDetailModal(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedClient(null);
    setFormData({ nombre: '', telefono: '', email: '', tipoCliente: 'Lead', estado: 'Activo', presupuesto: '', tipoPropiedad: '', ubicacionInteres: '', notas: '', propiedadVinculada: '' });
  };

  const goPrev   = () => { if (currentPage <= 1) return;             loadClientsPage(currentPage - 1); };
  const goNext   = () => { if (currentPage >= totalPages) return;     loadClientsPage(currentPage + 1); };
  const goToPage = (p) => { if (p < 1 || p > totalPages) return;     loadClientsPage(p); };

  // ─── Input / select styles reutilizables ─────────────────────────────────
  const inputCls = 'w-full rounded-lg px-4 py-3 text-sm text-white border border-slate-600/60 focus:border-yellow-500 outline-none transition-colors';
  const inputStyle = { backgroundColor: 'var(--color-input-bg, #141413)' };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">CRM · Clientes</h1>
          <p className="text-slate-400 text-sm">
            Página <span className="text-yellow-400 font-bold">{currentPage}</span> de{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="button-gold inline-flex items-center justify-center gap-2 px-4 md:px-6 py-3 w-full md:w-auto"
          >
            <FaPlus /> Nuevo Cliente
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div
        className="rounded-xl p-4 md:p-6 border border-slate-700/50"
        style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <FaSearch className="text-yellow-400" />
          <h3 className="text-base md:text-lg font-semibold text-white">Filtrar Clientes</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <select className={inputCls} style={inputStyle} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="Todos">Todos los tipos</option>
            <option value="Lead">Leads</option>
            <option value="Comprador">Compradores</option>
            <option value="Arrendatario">Arrendatarios</option>
            <option value="Propietario">Propietarios</option>
          </select>
          <select className={inputCls} style={inputStyle} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
            <option value="Convertido">Convertidos</option>
          </select>
          <input
            type="text"
            placeholder="Buscar nombre, email..."
            className={inputCls}
            style={inputStyle}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button
            onClick={() => { setFiltroTipo('Todos'); setFiltroEstado('Todos'); setBusqueda(''); }}
            className="rounded-lg px-4 py-3 text-sm font-semibold text-white border border-slate-600/60 hover:border-yellow-500/40 hover:bg-slate-700/50 transition-colors"
            style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
          >
            Limpiar Filtros
          </button>
        </div>
        <div className="mt-4 text-slate-500 text-xs">
          Mostrando <span className="text-yellow-400 font-semibold">{clientesFiltrados.length}</span> de {clients.length} en esta página
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">
          <FaSpinner className="animate-spin text-4xl text-yellow-400 mx-auto mb-4" />
          <p className="text-sm">Cargando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div
          className="text-center text-slate-400 py-12 rounded-xl border border-slate-700/50"
          style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
        >
          <FaUser className="text-5xl text-slate-700 mx-auto mb-4" />
          <p className="text-base mb-2 text-white">No hay clientes registrados</p>
          <p className="text-xs">Haz clic en "Nuevo Cliente" para empezar</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div
          className="text-center text-slate-400 py-12 rounded-xl border border-slate-700/50"
          style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
        >
          <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
          <p className="text-sm">No hay clientes que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {clientesFiltrados.map((client) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-xl border border-slate-700/50 hover:border-yellow-500/30 transition-all duration-300 overflow-hidden"
              style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
            >
              {/* Franja superior dorada para identidad inmobiliaria */}
              <div className="h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />

              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-2 truncate">{client.nombre}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <TipoBadge tipo={client.tipoCliente} />
                      <EstadoBadge estado={client.estado} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {client.telefono && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <FaPhone className="text-yellow-400 flex-shrink-0" />
                      <span className="truncate">{client.telefono}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <FaEnvelope className="text-yellow-400 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.ubicacionInteres && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <FaMapMarkerAlt className="text-yellow-400 flex-shrink-0" />
                      <span className="truncate">{client.ubicacionInteres}</span>
                    </div>
                  )}
                  {client.presupuesto && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <FaDollarSign className="text-yellow-400 flex-shrink-0" />
                      <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(client.presupuesto)}</span>
                    </div>
                  )}
                  {client.tipoPropiedad && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <FaHome className="text-yellow-400 flex-shrink-0" />
                      <span>{client.tipoPropiedad}</span>
                    </div>
                  )}
                </div>

                {client.notas && (
                  <div
                    className="rounded-lg p-3 mb-4 border border-slate-700/40"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <p className="text-slate-400 text-xs line-clamp-2">{client.notas}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/40">
                  {/* Ver detalle */}
                  <button
                    onClick={() => handleViewDetail(client)}
                    className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors text-slate-200 border border-slate-600/50 hover:border-yellow-500/40 hover:text-yellow-400"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    title="Ver detalle"
                  >
                    <FaEye /> <span className="hidden sm:inline">Ver</span>
                  </button>

                  {/* Agendar visita — MÓDULO 3 */}
                  <button
                    onClick={() => setVisitClient(client)}
                    className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors text-yellow-300 border border-yellow-600/40 hover:bg-yellow-500/10"
                    style={{ backgroundColor: 'rgba(234,179,8,0.06)' }}
                    title="Agendar visita"
                  >
                    <FaCalendarCheck /> <span className="hidden sm:inline">Visita</span>
                  </button>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/57${(client.telefono || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(client.nombre)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors text-emerald-300 border border-emerald-600/40 hover:bg-emerald-500/10"
                    style={{ backgroundColor: 'rgba(16,185,129,0.06)' }}
                    title="WhatsApp"
                  >
                    <FaWhatsapp /> <span className="hidden sm:inline">WA</span>
                  </a>
                </div>

                {(canUpdate || canDelete) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {canUpdate && (
                      <button
                        onClick={() => handleEditClient(client)}
                        className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors text-slate-300 border border-slate-600/50 hover:border-yellow-500/40 hover:text-yellow-400"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                      >
                        <FaEdit /> <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors text-red-400 border border-red-800/40 hover:bg-red-500/10"
                        style={{ backgroundColor: 'rgba(239,68,68,0.04)' }}
                      >
                        <FaTrash /> <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* PAGINACIÓN */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          onClick={goPrev}
          disabled={loading || currentPage === 1}
          className="px-3 py-2 rounded-xl border border-slate-700/60 text-slate-300 disabled:opacity-40 hover:border-yellow-500/40 transition inline-flex items-center gap-2 text-sm"
          style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
        >
          <FaChevronLeft /> Anterior
        </button>
        {pageButtons.map((p) => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            disabled={loading}
            className={`w-10 h-10 rounded-xl border transition font-semibold text-sm ${
              p === currentPage
                ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                : 'border-slate-700/60 text-slate-300 hover:border-yellow-500/40'
            }`}
            style={p !== currentPage ? { backgroundColor: 'var(--color-card-bg, #1a1917)' } : {}}
          >
            {p}
          </button>
        ))}
        <button
          onClick={goNext}
          disabled={loading || currentPage >= totalPages}
          className="px-3 py-2 rounded-xl border border-slate-700/60 text-slate-300 disabled:opacity-40 hover:border-yellow-500/40 transition inline-flex items-center gap-2 text-sm"
          style={{ backgroundColor: 'var(--color-card-bg, #1a1917)' }}
        >
          Siguiente <FaChevronRight />
        </button>
      </div>

      {/* MODAL FORMULARIO */}
      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={handleCloseForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-slate-700/60 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: 'var(--color-card-bg, #1e1e1c)' }}
            >
              <form onSubmit={handleSaveClient} className="p-4 md:p-8">
                <h2 className="text-xl font-bold text-yellow-400 mb-4">{selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">Nombre completo <span className="text-red-400">*</span></label>
                    <input type="text" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className={inputCls} style={inputStyle} placeholder="Ej: Juan Pérez" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Teléfono <span className="text-red-400">*</span></label>
                    <input type="tel" required value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className={inputCls} style={inputStyle} placeholder="3001234567" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputCls} style={inputStyle} placeholder="correo@ejemplo.com" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Tipo de cliente <span className="text-red-400">*</span></label>
                    <select required value={formData.tipoCliente} onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })} className={inputCls} style={inputStyle}>
                      <option value="Lead">Lead</option>
                      <option value="Comprador">Comprador</option>
                      <option value="Arrendatario">Arrendatario</option>
                      <option value="Propietario">Propietario</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Estado</label>
                    <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className={inputCls} style={inputStyle}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Convertido">Convertido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Presupuesto (COP)</label>
                    <input type="number" value={formData.presupuesto} onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })} className={inputCls} style={inputStyle} placeholder="50000000" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Tipo de propiedad de interés</label>
                    <select value={formData.tipoPropiedad} onChange={(e) => setFormData({ ...formData, tipoPropiedad: e.target.value })} className={inputCls} style={inputStyle}>
                      <option value="">Seleccionar...</option>
                      <option value="Casa">Casa</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Local">Local</option>
                      <option value="Lote">Lote</option>
                      <option value="Finca">Finca</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">Ubicación de interés</label>
                    <input type="text" value={formData.ubicacionInteres} onChange={(e) => setFormData({ ...formData, ubicacionInteres: e.target.value })} className={inputCls} style={inputStyle} placeholder="Ej: Anserma, Centro" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">Propiedad vinculada</label>
                    <select value={formData.propiedadVinculada} onChange={(e) => setFormData({ ...formData, propiedadVinculada: e.target.value })} className={inputCls} style={inputStyle}>
                      <option value="">Sin vincular</option>
                      {properties.map((prop) => (<option key={prop.id} value={prop.id}>{prop.title} - {prop.city}</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">Notas adicionales</label>
                    <textarea rows={4} value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Información adicional relevante..." />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button type="button" onClick={handleCloseForm} disabled={submitting} className="flex-1 border border-slate-600/60 hover:border-slate-500 text-slate-300 font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-50 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>Cancelar</button>
                  <button type="submit" disabled={submitting} className="flex-1 button-gold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm">
                    {submitting ? <><FaSpinner className="animate-spin" /> Guardando...</> : (selectedClient ? 'Actualizar' : 'Crear Cliente')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLE */}
      <AnimatePresence mode="wait">
        {showDetailModal && clientDetail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-slate-700/60 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: 'var(--color-card-bg, #1e1e1c)' }}
            >
              <div className="p-4 md:p-8 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-3xl font-bold text-white mb-2 truncate">{clientDetail.nombre}</h2>
                    <div className="flex flex-wrap gap-2">
                      <TipoBadge tipo={clientDetail.tipoCliente} />
                      <EstadoBadge estado={clientDetail.estado} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowDetailModal(false); setVisitClient(clientDetail); }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-yellow-300 border border-yellow-600/40 hover:bg-yellow-500/10 transition-colors"
                      style={{ backgroundColor: 'rgba(234,179,8,0.06)' }}
                    >
                      <FaCalendarCheck size={12} /> Agendar visita
                    </button>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                {/* Info básica */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientDetail.telefono && (
                    <div className="rounded-xl p-4 border border-slate-700/40" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2 mb-2"><FaPhone className="text-yellow-400" /><span className="text-slate-400 text-xs">Teléfono</span></div>
                      <a href={`tel:${clientDetail.telefono}`} className="text-white font-semibold hover:text-yellow-400 transition-colors text-sm break-all">{clientDetail.telefono}</a>
                    </div>
                  )}
                  {clientDetail.email && (
                    <div className="rounded-xl p-4 border border-slate-700/40" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2 mb-2"><FaEnvelope className="text-yellow-400" /><span className="text-slate-400 text-xs">Email</span></div>
                      <a href={`mailto:${clientDetail.email}`} className="text-white font-semibold hover:text-yellow-400 transition-colors text-sm break-all">{clientDetail.email}</a>
                    </div>
                  )}
                  {clientDetail.ubicacionInteres && (
                    <div className="rounded-xl p-4 border border-slate-700/40" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2 mb-2"><FaMapMarkerAlt className="text-yellow-400" /><span className="text-slate-400 text-xs">Ubicación de interés</span></div>
                      <p className="text-white font-semibold text-sm">{clientDetail.ubicacionInteres}</p>
                    </div>
                  )}
                  {clientDetail.presupuesto && (
                    <div className="rounded-xl p-4 border border-slate-700/40" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2 mb-2"><FaDollarSign className="text-yellow-400" /><span className="text-slate-400 text-xs">Presupuesto</span></div>
                      <p className="text-white font-semibold text-sm">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(clientDetail.presupuesto)}</p>
                    </div>
                  )}
                </div>

                {clientDetail.notas && (
                  <div className="rounded-xl p-4 border border-slate-700/40" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2 mb-3"><FaStickyNote className="text-yellow-400" /><span className="text-white font-semibold text-sm">Notas</span></div>
                    <p className="text-slate-300 leading-relaxed text-xs break-words">{clientDetail.notas}</p>
                  </div>
                )}

                {/* Pestañas */}
                <div>
                  <div className="flex gap-1 border-b border-slate-700/60 mb-4">
                    {[{ id: 'actividad', label: 'Historial', Icon: FaCalendarAlt }, { id: 'contratos', label: 'Contratos', Icon: FaFileContract }].map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        onClick={() => setDetailTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                          detailTab === id
                            ? 'text-yellow-400 border-b-2 border-yellow-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon size={13} /> {label}
                      </button>
                    ))}
                  </div>

                  {/* Pestaña actividad */}
                  {detailTab === 'actividad' && (
                    <div className="rounded-xl border border-slate-700/40 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-slate-400 text-xs mb-4">
                        {clientEvents.length ? `${clientEvents.length} ${clientEvents.length === 1 ? 'evento' : 'eventos'}` : 'Sin eventos aún'}
                      </p>
                      {loadingEvents ? (
                        <div className="flex justify-center py-8"><FaSpinner className="animate-spin text-yellow-400 text-2xl" /></div>
                      ) : clientEvents.length === 0 ? (
                        <div className="text-center py-8">
                          <FaCalendarAlt className="text-slate-600 text-3xl mx-auto mb-3" />
                          <p className="text-slate-400 text-sm">Sin historial de actividad</p>
                          <button
                            onClick={() => { setShowDetailModal(false); setVisitClient(clientDetail); }}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-yellow-300 border border-yellow-600/40 hover:bg-yellow-500/10 transition-colors"
                            style={{ backgroundColor: 'rgba(234,179,8,0.06)' }}
                          >
                            <FaCalendarCheck size={11} /> Agendar primera visita
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clientEvents.map((event) => {
                            const TypeIcon   = getTypeIcon(event.type);
                            const StatusIcon = getStatusIcon(event.status);
                            return (
                              <div key={event.id} className="flex gap-3 p-3 rounded-xl border border-slate-700/40" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeColor(event.type)} bg-current/10`}>
                                  <TypeIcon className={`text-sm ${getTypeColor(event.type)}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-white text-xs font-semibold capitalize">{event.type || 'Actividad'}</span>
                                    <StatusIcon className={`text-xs ${getStatusColor(event.status)}`} />
                                    <span className={`text-[10px] capitalize ${getStatusColor(event.status)}`}>{event.status}</span>
                                  </div>
                                  {event.propertyName && <p className="text-slate-400 text-xs truncate">{event.propertyName}</p>}
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-slate-500 text-[10px]">
                                      {event.start ? format(event.start, "d MMM yyyy, HH:mm", { locale: es }) : '—'}
                                    </span>
                                    {event.agentName && <span className="text-slate-500 text-[10px]">{event.agentName}</span>}
                                  </div>
                                  {event.notes && <p className="text-slate-500 text-[10px] mt-1 line-clamp-1">{event.notes}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pestaña contratos */}
                  {detailTab === 'contratos' && (
                    <ClientContracts clientId={clientDetail.id} />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL VISITA */}
      <AnimatePresence>
        {visitClient && (
          <ScheduleVisitModal
            client={visitClient}
            properties={properties}
            onClose={() => setVisitClient(null)}
            onSaved={() => {
              // Si el detalle está abierto para este cliente, refrescar actividad
              if (clientDetail?.id === visitClient.id) {
                setDetailTab('actividad');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ClientManagement;
