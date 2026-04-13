import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBuilding, FaUser, FaFileContract,
  FaChevronRight, FaChevronLeft, FaUpload,
  FaTimes, FaSpinner, FaSearch, FaUserTie,
  FaCheckCircle,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { contractService } from '../services/contract.service';
import {
  CONTRACT_STATUS, CONTRACT_TYPE,
  CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS,
} from '../types/contract.types';
import { formatCOP } from '../../../shared/utils/formatCurrency';

// ── Autocomplete genérico ──────────────────────────────────────────────────────
function AutocompleteField({ placeholder, value, onSearch, results, onSelect, onClear, loading, renderItem, renderSelected }) {
  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center justify-between p-3 bg-green-500/10
          border border-green-500/30 rounded-xl">
          <div className="flex-1 min-w-0">{renderSelected(value)}</div>
          <button onClick={onClear} className="text-slate-500 hover:text-red-400 transition-colors ml-2">
            <FaTimes size={12} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
            <input
              type="text"
              placeholder={placeholder}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl
                pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500
                focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
            {loading && <FaSpinner className="absolute right-3 top-3 animate-spin text-slate-400" size={12} />}
          </div>
          {results.length > 0 && (
            <ul className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map((item, i) => (
                <li key={item.id ?? i}>
                  <button
                    onClick={() => onSelect(item)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800
                      transition-colors border-b border-slate-800 last:border-0"
                  >
                    {renderItem(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ContractForm({ onSuccess, onCancel }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // ── Paso 1: Propiedad ──────────────────────────────────────────────────────
  const [propSearch,   setPropSearch]   = useState('');
  const [propResults,  setPropResults]  = useState([]);
  const [propLoading,  setPropLoading]  = useState(false);
  const [selectedProp, setSelectedProp] = useState(null);
  const propTimer = useRef(null);

  useEffect(() => {
    if (!propSearch.trim() || propSearch.length < 2) { setPropResults([]); return; }
    clearTimeout(propTimer.current);
    propTimer.current = setTimeout(async () => {
      setPropLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'properties'), orderBy('title'), limit(20)));
        const q = propSearch.toLowerCase();
        setPropResults(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) =>
              p.title?.toLowerCase().includes(q) ||
              p.address?.toLowerCase().includes(q) ||
              p.city?.toLowerCase().includes(q)
            )
        );
      } catch { setPropResults([]); }
      finally  { setPropLoading(false); }
    }, 350);
  }, [propSearch]);

  // ── Paso 2: Cliente — busca en /clients (módulo real) y en /users ──────────
  const [clientSearch,   setClientSearch]   = useState('');
  const [clientResults,  setClientResults]  = useState([]);
  const [clientLoading,  setClientLoading]  = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const clientTimer = useRef(null);

  useEffect(() => {
    if (!clientSearch.trim() || clientSearch.length < 2) { setClientResults([]); return; }
    clearTimeout(clientTimer.current);
    clientTimer.current = setTimeout(async () => {
      setClientLoading(true);
      try {
        const q = clientSearch.toLowerCase();
        // Buscar primero en /clients (módulo de clientes de la app)
        const clientsSnap = await getDocs(query(collection(db, 'clients'), limit(30)));
        const fromClients = clientsSnap.docs
          .map((d) => ({ id: d.id, _source: 'clients', ...d.data() }))
          .filter((c) =>
            c.nombre?.toLowerCase().includes(q) ||
            c.name?.toLowerCase().includes(q)   ||
            c.email?.toLowerCase().includes(q)  ||
            c.telefono?.includes(q)
          )
          .map((c) => ({
            id:          c.id,
            _source:     'clients',
            displayName: c.nombre || c.name || '',
            email:       c.email  || '',
            phone:       c.telefono || c.phone || '',
          }));

        // También buscar en /users con roles cliente
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('role', 'in', ['client', 'viewer']), limit(20))
        );
        const fromUsers = usersSnap.docs
          .map((d) => ({ id: d.id, _source: 'users', ...d.data() }))
          .filter((u) =>
            u.displayName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)       ||
            u.phone?.includes(q)
          )
          .map((u) => ({
            id:          u.id,
            _source:     'users',
            displayName: u.displayName || u.email || '',
            email:       u.email || '',
            phone:       u.phone || '',
          }));

        // Deduplicar por email
        const byEmail = new Map();
        [...fromClients, ...fromUsers].forEach((c) => {
          if (c.email && !byEmail.has(c.email)) byEmail.set(c.email, c);
          else if (!c.email) byEmail.set(c.id, c);
        });
        setClientResults(Array.from(byEmail.values()).slice(0, 10));
      } catch { setClientResults([]); }
      finally  { setClientLoading(false); }
    }, 350);
  }, [clientSearch]);

  // ── Paso 3: Agente + datos del contrato ────────────────────────────────────
  const [agents,         setAgents]         = useState([]);
  const [selectedAgent,  setSelectedAgent]  = useState(null);

  useEffect(() => {
    if (step !== 3) return;
    getDocs(query(collection(db, 'users'), where('role', 'in', ['member', 'admin']))).then((snap) => {
      setAgents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // Pre-seleccionar al usuario actual si es member/admin
      const me = snap.docs.find((d) => d.data().email === currentUser?.email);
      if (me && !selectedAgent) {
        setSelectedAgent({ id: me.id, ...me.data() });
      }
    }).catch(() => {});
  }, [step]);

  const [form, setForm] = useState({
    type:      CONTRACT_TYPE.RENT,
    startDate: '',
    endDate:   '',
    value:     '',
    status:    CONTRACT_STATUS.ACTIVE,
    notes:     '',
  });
  const [docFile, setDocFile] = useState(null);
  const fileRef = useRef(null);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedProp)   { toast.error('Selecciona una propiedad'); return; }
    if (!selectedClient) { toast.error('Selecciona un cliente');    return; }
    if (!form.startDate) { toast.error('Ingresa la fecha de inicio'); return; }
    if (!form.value || Number(form.value) <= 0) { toast.error('Ingresa el valor del contrato'); return; }

    setSaving(true);
    try {
      const agentData = selectedAgent || {
        id:    currentUser?.uid    || '',
        email: currentUser?.email  || '',
        displayName: currentUser?.displayName || currentUser?.email || '',
      };

      const contractData = {
        ...form,
        value:           Number(form.value),
        propertyId:      selectedProp.id,
        propertyName:    selectedProp.title    ?? '',
        propertyAddress: selectedProp.address  ?? selectedProp.city ?? '',
        clientId:        selectedClient.id,
        clientName:      selectedClient.displayName || selectedClient.email,
        clientEmail:     selectedClient.email,
        clientPhone:     selectedClient.phone || '',
        agentId:         agentData.id    || agentData.uid || '',
        agentName:       agentData.displayName || agentData.name || agentData.email || '',
        agentEmail:      agentData.email || '',
      };

      const contractId = await contractService.createContract(contractData, currentUser?.email);

      if (docFile) {
        await contractService.uploadDocument(contractId, docFile);
      }

      toast.success('Contrato creado correctamente ✓');
      onSuccess?.(contractId);
    } catch (error) {
      console.error('[ContractForm] handleSave:', error);
      toast.error('Error al crear el contrato');
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Propiedad', icon: FaBuilding },
    { n: 2, label: 'Cliente',   icon: FaUser     },
    { n: 3, label: 'Contrato',  icon: FaFileContract },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map(({ n, label, icon: Icon }, idx) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => n < step && setStep(n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                transition-colors w-full justify-center
                ${step === n
                  ? 'bg-primary text-slate-950'
                  : n < step
                    ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-default'
                }`}
            >
              {n < step
                ? <FaCheckCircle size={11} />
                : <Icon size={11} />
              }
              {label}
            </button>
            {idx < STEPS.length - 1 && (
              <FaChevronRight className="text-slate-600 flex-shrink-0" size={10} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Paso 1: Propiedad ── */}
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="space-y-3"
          >
            <label className="block text-slate-300 text-sm font-semibold">
              <FaBuilding className="inline mr-1.5 text-slate-500" size={12} />
              Selecciona la propiedad
            </label>
            <AutocompleteField
              placeholder="Nombre, dirección o ciudad..."
              value={selectedProp}
              onSearch={setPropSearch}
              results={propResults}
              onSelect={(p) => { setSelectedProp(p); setPropResults([]); }}
              onClear={() => { setSelectedProp(null); setPropSearch(''); }}
              loading={propLoading}
              renderItem={(p) => (
                <>
                  <p className="text-slate-200 text-sm font-medium">{p.title}</p>
                  <p className="text-slate-500 text-xs">{p.address ?? p.city}</p>
                </>
              )}
              renderSelected={(p) => (
                <>
                  <p className="text-green-300 text-sm font-semibold">{p.title}</p>
                  <p className="text-slate-400 text-xs">{p.address ?? p.city}</p>
                </>
              )}
            />
            <button
              onClick={() => selectedProp && setStep(2)}
              disabled={!selectedProp}
              className="w-full py-2.5 rounded-xl font-semibold text-sm
                bg-primary text-slate-950 hover:bg-primary/90
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                flex items-center justify-center gap-2"
            >
              Siguiente <FaChevronRight size={11} />
            </button>
          </motion.div>
        )}

        {/* ── Paso 2: Cliente ── */}
        {step === 2 && (
          <motion.div key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="space-y-3"
          >
            <label className="block text-slate-300 text-sm font-semibold">
              <FaUser className="inline mr-1.5 text-slate-500" size={12} />
              Selecciona el cliente
            </label>
            <AutocompleteField
              placeholder="Nombre, email o teléfono..."
              value={selectedClient}
              onSearch={setClientSearch}
              results={clientResults}
              onSelect={(c) => { setSelectedClient(c); setClientResults([]); }}
              onClear={() => { setSelectedClient(null); setClientSearch(''); }}
              loading={clientLoading}
              renderItem={(c) => (
                <>
                  <p className="text-slate-200 text-sm font-medium">{c.displayName || c.email}</p>
                  <p className="text-slate-500 text-xs">{c.email} {c.phone ? `· ${c.phone}` : ''}</p>
                </>
              )}
              renderSelected={(c) => (
                <>
                  <p className="text-green-300 text-sm font-semibold">{c.displayName || c.email}</p>
                  <p className="text-slate-400 text-xs">{c.email}</p>
                </>
              )}
            />
            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm
                  bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors
                  flex items-center justify-center gap-2">
                <FaChevronLeft size={11} /> Atrás
              </button>
              <button
                onClick={() => selectedClient && setStep(3)}
                disabled={!selectedClient}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm
                  bg-primary text-slate-950 hover:bg-primary/90
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                  flex items-center justify-center gap-2">
                Siguiente <FaChevronRight size={11} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Paso 3: Datos del contrato ── */}
        {step === 3 && (
          <motion.div key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="space-y-4"
          >
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-xs mb-0.5">Propiedad</p>
                <p className="text-slate-200 text-sm font-semibold truncate">{selectedProp?.title}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-xs mb-0.5">Cliente</p>
                <p className="text-slate-200 text-sm font-semibold truncate">
                  {selectedClient?.displayName || selectedClient?.email}
                </p>
              </div>
            </div>

            {/* Tipo + Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Tipo *</label>
                <select name="type" value={form.type} onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                    text-sm text-slate-200 focus:border-primary outline-none transition-colors">
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Estado inicial</label>
                <select name="status" value={form.status} onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                    text-sm text-slate-200 focus:border-primary outline-none transition-colors">
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Fecha inicio *</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                    text-sm text-slate-200 focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Fecha fin</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleFormChange}
                  min={form.startDate}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                    text-sm text-slate-200 focus:border-primary outline-none transition-colors" />
              </div>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                Valor (COP) *
              </label>
              <input type="number" name="value" value={form.value} onChange={handleFormChange}
                placeholder="Ej: 800000" min="0"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                  text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary outline-none transition-colors" />
              {Number(form.value) > 0 && (
                <p className="text-slate-500 text-xs mt-1">{formatCOP(form.value)}</p>
              )}
            </div>

            {/* Agente responsable */}
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                <FaUserTie className="inline mr-1" size={10} />
                Agente responsable
              </label>
              <select
                value={selectedAgent?.id || ''}
                onChange={(e) => {
                  const agent = agents.find((a) => a.id === e.target.value);
                  setSelectedAgent(agent || null);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                  text-sm text-slate-200 focus:border-primary outline-none transition-colors"
              >
                <option value="">Sin agente asignado</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName || a.name || a.email}
                    {a.email === currentUser?.email ? ' (yo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">Notas</label>
              <textarea name="notes" value={form.notes} onChange={handleFormChange}
                rows={2} placeholder="Condiciones especiales, observaciones..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5
                  text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary outline-none transition-colors resize-none" />
            </div>

            {/* Upload PDF */}
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">Documento PDF (opcional)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-xl p-4
                  flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <FaUpload className="text-slate-500" size={14} />
                <span className="text-slate-400 text-xs flex-1 truncate">
                  {docFile ? docFile.name : 'Haz clic para adjuntar el contrato en PDF'}
                </span>
                {docFile && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDocFile(null); }}
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf"
                className="hidden"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Botones finales */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm
                  bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors
                  flex items-center justify-center gap-2">
                <FaChevronLeft size={11} /> Atrás
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm
                  bg-primary text-slate-950 hover:bg-primary/90
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                  flex items-center justify-center gap-2">
                {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Guardar contrato'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}