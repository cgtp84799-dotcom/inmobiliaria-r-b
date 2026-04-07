import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBuilding, FaUser, FaFileContract,
  FaChevronRight, FaChevronLeft, FaUpload,
  FaTimes, FaSpinner, FaSearch,
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

/**
 * ContractForm — stepper de 3 pasos para crear un contrato.
 *
 * Paso 1: Seleccionar propiedad (autocomplete desde /properties)
 * Paso 2: Seleccionar cliente   (autocomplete desde /users role:client)
 * Paso 3: Tipo, fechas, valor, notas, upload PDF
 *
 * Props:
 *   onSuccess(contractId) — callback al guardar exitosamente
 *   onCancel()            — callback para cerrar sin guardar
 */
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
    if (!propSearch || propSearch.length < 2) { setPropResults([]); return; }
    clearTimeout(propTimer.current);
    propTimer.current = setTimeout(async () => {
      setPropLoading(true);
      try {
        // Busca en /properties por slug o título — simple query
        const snap = await getDocs(
          query(collection(db, 'properties'), orderBy('title'), limit(20))
        );
        const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const q    = propSearch.toLowerCase();
        setPropResults(all.filter((p) =>
          p.title?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q)
        ));
      } catch { setPropResults([]); }
      finally  { setPropLoading(false); }
    }, 350);
  }, [propSearch]);

  // ── Paso 2: Cliente ────────────────────────────────────────────────────────
  const [clientSearch,   setClientSearch]   = useState('');
  const [clientResults,  setClientResults]  = useState([]);
  const [clientLoading,  setClientLoading]  = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const clientTimer = useRef(null);

  useEffect(() => {
    if (!clientSearch || clientSearch.length < 2) { setClientResults([]); return; }
    clearTimeout(clientTimer.current);
    clientTimer.current = setTimeout(async () => {
      setClientLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('role', 'in', ['client', 'viewer']), limit(30))
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const q   = clientSearch.toLowerCase();
        setClientResults(all.filter((u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)       ||
          u.phone?.includes(q)
        ));
      } catch { setClientResults([]); }
      finally  { setClientLoading(false); }
    }, 350);
  }, [clientSearch]);

  // ── Paso 3: Datos del contrato ─────────────────────────────────────────────
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
      const contractData = {
        ...form,
        value:           Number(form.value),
        propertyId:      selectedProp.id,
        propertyName:    selectedProp.title    ?? '',
        propertyAddress: selectedProp.address  ?? selectedProp.city ?? '',
        clientId:        selectedClient.id,
        clientName:      selectedClient.displayName ?? selectedClient.email,
        clientEmail:     selectedClient.email,
        agentId:         currentUser?.uid     ?? '',
        agentName:       currentUser?.displayName ?? currentUser?.email ?? '',
        agentEmail:      currentUser?.email   ?? '',
      };

      const contractId = await contractService.createContract(contractData, currentUser?.email);

      // Subir PDF si se adjuntó uno
      if (docFile) {
        await contractService.uploadDocument(contractId, docFile);
      }

      toast.success('Contrato creado correctamente');
      onSuccess?.(contractId);
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el contrato');
    } finally {
      setSaving(false);
    }
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────
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
                ${ step === n
                  ? 'bg-primary text-slate-950'
                  : n < step
                    ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-default'
                }`}
            >
              <Icon size={12} /> {label}
            </button>
            {idx < STEPS.length - 1 && (
              <FaChevronRight className="text-slate-600 flex-shrink-0" size={10} />
            )}
          </div>
        ))}
      </div>

      {/* ── Paso 1: Propiedad ── */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="space-y-3"
          >
            <label className="block text-slate-300 text-sm font-semibold">
              <FaBuilding className="inline mr-1.5 text-slate-500" size={12} />
              Buscar propiedad
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
              <input
                type="text"
                placeholder="Nombre, dirección o ciudad..."
                value={selectedProp ? selectedProp.title : propSearch}
                onChange={(e) => { setSelectedProp(null); setPropSearch(e.target.value); }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl
                  pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
              {propLoading && <FaSpinner className="absolute right-3 top-3 animate-spin text-slate-400" size={12} />}
            </div>

            {selectedProp ? (
              <div className="flex items-center justify-between p-3 bg-green-500/10
                border border-green-500/30 rounded-xl">
                <div>
                  <p className="text-green-300 text-sm font-semibold">{selectedProp.title}</p>
                  <p className="text-slate-400 text-xs">{selectedProp.address ?? selectedProp.city}</p>
                </div>
                <button onClick={() => setSelectedProp(null)}
                  className="text-slate-500 hover:text-red-400 transition-colors">
                  <FaTimes size={12} />
                </button>
              </div>
            ) : propResults.length > 0 && (
              <ul className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {propResults.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => { setSelectedProp(p); setPropSearch(''); setPropResults([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800
                        transition-colors border-b border-slate-800 last:border-0"
                    >
                      <p className="text-slate-200 text-sm font-medium">{p.title}</p>
                      <p className="text-slate-500 text-xs">{p.address ?? p.city}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

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
              Buscar cliente
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400" size={12} />
              <input
                type="text"
                placeholder="Nombre, email o teléfono..."
                value={selectedClient ? (selectedClient.displayName ?? selectedClient.email) : clientSearch}
                onChange={(e) => { setSelectedClient(null); setClientSearch(e.target.value); }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl
                  pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
              {clientLoading && <FaSpinner className="absolute right-3 top-3 animate-spin text-slate-400" size={12} />}
            </div>

            {selectedClient ? (
              <div className="flex items-center justify-between p-3 bg-green-500/10
                border border-green-500/30 rounded-xl">
                <div>
                  <p className="text-green-300 text-sm font-semibold">
                    {selectedClient.displayName ?? selectedClient.email}
                  </p>
                  <p className="text-slate-400 text-xs">{selectedClient.email}</p>
                </div>
                <button onClick={() => setSelectedClient(null)}
                  className="text-slate-500 hover:text-red-400 transition-colors">
                  <FaTimes size={12} />
                </button>
              </div>
            ) : clientResults.length > 0 && (
              <ul className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {clientResults.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => { setSelectedClient(u); setClientSearch(''); setClientResults([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800
                        transition-colors border-b border-slate-800 last:border-0"
                    >
                      <p className="text-slate-200 text-sm font-medium">
                        {u.displayName ?? u.email}
                      </p>
                      <p className="text-slate-500 text-xs">{u.email} · {u.phone ?? 'sin teléfono'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

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
                  {selectedClient?.displayName ?? selectedClient?.email}
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
              {form.value > 0 && (
                <p className="text-slate-500 text-xs mt-1">{formatCOP(form.value)}</p>
              )}
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
                <span className="text-slate-400 text-xs">
                  {docFile ? docFile.name : 'Haz clic para adjuntar el contrato en PDF'}
                </span>
                {docFile && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDocFile(null); }}
                    className="ml-auto text-slate-500 hover:text-red-400 transition-colors">
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
