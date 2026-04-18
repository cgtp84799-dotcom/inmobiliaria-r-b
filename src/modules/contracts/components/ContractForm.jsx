// src/modules/contracts/components/ContractForm.jsx

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBuilding, FaUser, FaFileContract,
  FaChevronRight, FaChevronLeft, FaUpload,
  FaTimes, FaSpinner, FaSearch, FaUserTie,
  FaCheckCircle, FaInfoCircle,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { contractService } from '../services/contract.service';
import {
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  CONTRACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_OPERATION_MODE,
} from '../types/contract.types';
import { formatCOP } from '../../../shared/utils/formatCurrency';

function addMonths(dateStr, months) {
  if (!dateStr || !months) return '';
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().split('T')[0];
}

function AutocompleteField({
  placeholder,
  value,
  onSearch,
  results,
  onSelect,
  onClear,
  loading,
  renderItem,
  renderSelected,
}) {
  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex-1 min-w-0">{renderSelected(value)}</div>
          <button
            onClick={onClear}
            className="text-slate-500 hover:text-red-400 transition-colors ml-2"
          >
            <FaTimes size={12} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <FaSearch
              className="absolute left-3 top-3 text-slate-400"
              size={12}
            />
            <input
              type="text"
              placeholder={placeholder}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl
                pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500
                focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
            {loading && (
              <FaSpinner
                className="absolute right-3 top-3 animate-spin text-slate-400"
                size={12}
              />
            )}
          </div>
          {results.length > 0 && (
            <ul className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map((item, i) => (
                <li key={item.id ?? i}>
                  <button
                    onClick={() => onSelect(item)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
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

function ContractTypeFields({ type, form, setForm }) {
  const inputCls =
    'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-primary outline-none transition-colors';

  if (type === CONTRACT_TYPE.RENT) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
          <FaInfoCircle className="text-emerald-400 text-xs flex-shrink-0 mt-0.5" />
          <p className="text-emerald-300 text-[11px]">
            En Colombia el incremento anual del cánon está limitado al IPC del
            año anterior (Ley 820/2003). Los arriendos típicamente son de 6 a 24
            meses.
          </p>
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Cánon mensual (COP) *
          </label>
          <input
            type="number"
            value={form.value}
            onChange={(e) =>
              setForm((f) => ({ ...f, value: e.target.value }))
            }
            placeholder="Ej: 800000"
            min="0"
            className={inputCls}
          />
          {Number(form.value) > 0 && (
            <p className="text-slate-500 text-xs mt-1">
              {formatCOP(form.value)} / mes
            </p>
          )}
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Duración del contrato
          </label>
          <select
            value={form.durationMonths || ''}
            onChange={(e) => {
              const months = e.target.value;
              setForm((f) => ({
                ...f,
                durationMonths: months,
                endDate:
                  months && months !== 'custom' && f.startDate
                    ? addMonths(f.startDate, months)
                    : f.endDate,
              }));
            }}
            className={inputCls}
          >
            <option value="">Seleccionar duración...</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses (1 año)</option>
            <option value="24">24 meses (2 años)</option>
            <option value="36">36 meses (3 años)</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Inicio del arriendo *
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setForm((f) => ({
                  ...f,
                  startDate,
                  endDate:
                    f.durationMonths && f.durationMonths !== 'custom'
                      ? addMonths(startDate, f.durationMonths)
                      : f.endDate,
                }));
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Fin del arriendo
            </label>
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className={inputCls}
            />
            {form.endDate && form.startDate && (
              <p className="text-slate-500 text-xs mt-1">
                {Math.round(
                  (new Date(form.endDate) - new Date(form.startDate)) /
                    (1000 * 60 * 60 * 24 * 30)
                )}{' '}
                meses
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Incremento anual pactado
            <span className="text-slate-500 font-normal ml-1">
              (opcional, solo informativo)
            </span>
          </label>
          <select
            value={form.incrementType || ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, incrementType: e.target.value }))
            }
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            <option value="ipc">IPC del año anterior (legal)</option>
            <option value="ipc_plus">IPC + porcentaje pactado</option>
            <option value="fixed">Porcentaje fijo pactado</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Día de pago mensual
            </label>
            <input
              type="number"
              value={form.paymentDay || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentDay: e.target.value }))
              }
              placeholder="Ej: 5"
              min="1"
              max="28"
              className={inputCls}
            />
            <p className="text-slate-600 text-[10px] mt-0.5">Día del mes para cobrar el canon</p>
          </div>
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Administración mensual
              <span className="text-slate-500 font-normal ml-1">(opc)</span>
            </label>
            <input
              type="number"
              value={form.adminFee || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, adminFee: e.target.value }))
              }
              placeholder="Ej: 150000"
              min="0"
              className={inputCls}
            />
            {Number(form.adminFee) > 0 && (
              <p className="text-slate-500 text-xs mt-1">
                {formatCOP(form.adminFee)} / mes
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === CONTRACT_TYPE.SALE) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
          <FaInfoCircle className="text-blue-400 text-xs flex-shrink-0 mt-0.5" />
          <p className="text-blue-300 text-[11px]">
            En Colombia la transferencia de dominio requiere: promesa de
            compraventa → pago/crédito → escritura pública ante notaría →
            registro en Instrumentos Públicos.
          </p>
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Precio total de venta (COP) *
          </label>
          <input
            type="number"
            value={form.value}
            onChange={(e) =>
              setForm((f) => ({ ...f, value: e.target.value }))
            }
            placeholder="Ej: 250000000"
            min="0"
            className={inputCls}
          />
          {Number(form.value) > 0 && (
            <p className="text-slate-500 text-xs mt-1">
              {formatCOP(form.value)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Forma de pago
          </label>
          <select
            value={form.paymentMethod || ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, paymentMethod: e.target.value }))
            }
            className={inputCls}
          >
            <option value="">Seleccionar...</option>
            <option value="contado">Al contado (pago único)</option>
            <option value="credito">Crédito hipotecario</option>
            <option value="cuotas">Cuotas pactadas entre partes</option>
            <option value="leasing">Leasing habitacional</option>
          </select>
        </div>

        {form.paymentMethod === 'cuotas' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                Número de cuotas
              </label>
              <input
                type="number"
                value={form.installments || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, installments: e.target.value }))
                }
                placeholder="Ej: 3"
                min="2"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                Valor por cuota
              </label>
              <input
                type="number"
                value={form.installmentValue || ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    installmentValue: e.target.value,
                  }))
                }
                placeholder="Auto"
                className={inputCls}
              />
              {form.installments &&
                Number(form.value) > 0 &&
                !form.installmentValue && (
                  <p className="text-slate-500 text-xs mt-1">
                    Aprox.{' '}
                    {formatCOP(
                      Math.round(
                        Number(form.value) / Number(form.installments)
                      )
                    )}{' '}
                    / cuota
                  </p>
                )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Fecha promesa / inicio *
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Fecha escritura estimada
            </label>
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Notaría
            <span className="text-slate-500 font-normal ml-1">
              (opcional)
            </span>
          </label>
          <input
            type="text"
            value={form.notaria || ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, notaria: e.target.value }))
            }
            placeholder="Ej: Notaría 1 de Anserma"
            className={inputCls}
          />
        </div>
      </div>
    );
  }

  if (type === CONTRACT_TYPE.PROMISE) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl">
          <FaInfoCircle className="text-purple-400 text-xs flex-shrink-0 mt-0.5" />
          <p className="text-purple-300 text-[11px]">
            La promesa de compraventa es el contrato previo a la escritura.
            Define precio, plazo y condiciones. Tiene fuerza vinculante y
            genera obligaciones para ambas partes.
          </p>
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Valor prometido (COP) *
          </label>
          <input
            type="number"
            value={form.value}
            onChange={(e) =>
              setForm((f) => ({ ...f, value: e.target.value }))
            }
            placeholder="Ej: 180000000"
            min="0"
            className={inputCls}
          />
          {Number(form.value) > 0 && (
            <p className="text-slate-500 text-xs mt-1">
              {formatCOP(form.value)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">
            Arras / Anticipo
            <span className="text-slate-500 font-normal ml-1">
              (opcional)
            </span>
          </label>
          <input
            type="number"
            value={form.earnestMoney || ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, earnestMoney: e.target.value }))
            }
            placeholder="Ej: 10000000"
            className={inputCls}
          />
          {Number(form.earnestMoney) > 0 && (
            <p className="text-slate-500 text-xs mt-1">
              {formatCOP(form.earnestMoney)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Fecha de la promesa *
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Plazo para escritura *
            </label>
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className={inputCls}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-slate-300 text-xs font-semibold mb-1.5">
          Valor *
        </label>
        <input
          type="number"
          value={form.value}
          onChange={(e) =>
            setForm((f) => ({ ...f, value: e.target.value }))
          }
          placeholder="Valor del contrato"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-xs font-semibold mb-1.5">
          Fecha inicio *
        </label>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) =>
            setForm((f) => ({ ...f, startDate: e.target.value }))
          }
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none"
        />
      </div>
    </div>
  );
}

export default function ContractForm({ onSuccess, onCancel }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [propSearch, setPropSearch] = useState('');
  const [propResults, setPropResults] = useState([]);
  const [propLoading, setPropLoading] = useState(false);
  const [selectedProp, setSelectedProp] = useState(null);
  const propTimer = useRef(null);

  useEffect(() => {
    if (!propSearch.trim() || propSearch.length < 2) {
      setPropResults([]);
      return;
    }
    clearTimeout(propTimer.current);
    propTimer.current = setTimeout(async () => {
      setPropLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'properties'),
            orderBy('title'),
            limit(20)
          )
        );
        const q = propSearch.toLowerCase();
        setPropResults(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (p) =>
                p.title?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q) ||
                p.city?.toLowerCase().includes(q)
            )
        );
      } catch {
        setPropResults([]);
      } finally {
        setPropLoading(false);
      }
    }, 350);
  }, [propSearch]);

  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const clientTimer = useRef(null);

  useEffect(() => {
    if (!clientSearch.trim() || clientSearch.length < 2) {
      setClientResults([]);
      return;
    }
    clearTimeout(clientTimer.current);
    clientTimer.current = setTimeout(async () => {
      setClientLoading(true);
      try {
        const q = clientSearch.toLowerCase();
        const clientsSnap = await getDocs(
          query(collection(db, 'clients'), limit(30))
        );
        const fromClients = clientsSnap.docs
          .map((d) => ({ id: d.id, _source: 'clients', ...d.data() }))
          .filter(
            (c) =>
              c.nombre?.toLowerCase().includes(q) ||
              c.name?.toLowerCase().includes(q) ||
              c.email?.toLowerCase().includes(q) ||
              c.telefono?.includes(q)
          )
          .map((c) => ({
            id: c.id,
            _source: 'clients',
            displayName: c.nombre || c.name || '',
            email: c.email || '',
            phone: c.telefono || c.phone || '',
          }));

        const usersSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('role', 'in', ['client', 'viewer']),
            limit(20)
          )
        );
        const fromUsers = usersSnap.docs
          .map((d) => ({ id: d.id, _source: 'users', ...d.data() }))
          .filter(
            (u) =>
              u.displayName?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              u.phone?.includes(q)
          )
          .map((u) => ({
            id: u.id,
            _source: 'users',
            displayName: u.displayName || u.email || '',
            email: u.email || '',
            phone: u.phone || '',
          }));

        const byEmail = new Map();
        [...fromClients, ...fromUsers].forEach((c) => {
          if (c.email && !byEmail.has(c.email)) byEmail.set(c.email, c);
          else if (!c.email) byEmail.set(c.id, c);
        });
        setClientResults(Array.from(byEmail.values()).slice(0, 10));
      } catch {
        setClientResults([]);
      } finally {
        setClientLoading(false);
      }
    }, 350);
  }, [clientSearch]);

  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    if (step !== 3) return;
    getDocs(
      query(
        collection(db, 'users'),
        where('role', 'in', ['member', 'admin'])
      )
    )
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAgents(list);
        const me = list.find(
          (u) => u.email === currentUser?.email
        );
        if (me && !selectedAgent) setSelectedAgent(me);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const [form, setForm] = useState({
    type: CONTRACT_TYPE.RENT,
    status: CONTRACT_STATUS.DRAFT,
    startDate: '',
    endDate: '',
    value: '',
    notes: '',
    durationMonths: '',
    incrementType: '',
    paymentMethod: '',
    installments: '',
    installmentValue: '',
    notaria: '',
    earnestMoney: '',
    paymentDay: '',
    adminFee: '',
    deposit: '',
    initialPayment: '',
  });

  const [docFile, setDocFile] = useState(null);
  const fileRef = useRef(null);

  const handleSave = async () => {
    if (!selectedProp) {
      toast.error('Selecciona una propiedad');
      return;
    }
    if (!selectedClient) {
      toast.error('Selecciona un cliente');
      return;
    }
    if (!form.startDate) {
      toast.error('Ingresa la fecha de inicio');
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      toast.error('Ingresa el valor del contrato');
      return;
    }

    // Verificar si la propiedad ya tiene un contrato activo/borrador/pausado
    setSaving(true);
    try {
      const existingContract = await contractService.getActiveContractByProperty(selectedProp.id);
      if (existingContract) {
        const sLabel = { vigente: 'vigente', borrador: 'en borrador', pausado: 'pausado' };
        const statusText = sLabel[existingContract.statusGeneral] || existingContract.statusGeneral;
        toast.error(
          `Esta propiedad ya tiene un contrato ${statusText} con ${existingContract.clientName || 'un cliente'}. Finalízalo o cancélalo primero.`,
          { duration: 5000 }
        );
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('[ContractForm] check existing contract:', e.message);
      // No bloquear si falla la verificación
    }

    try {
      const agentData = selectedAgent || {
        id: currentUser?.uid || '',
        email: currentUser?.email || '',
        displayName:
          currentUser?.displayName || currentUser?.email || '',
      };

      const extraFields = {};
      if (form.type === CONTRACT_TYPE.RENT) {
        extraFields.durationMonths = form.durationMonths || null;
        extraFields.incrementType = form.incrementType || null;
      }
      if (form.type === CONTRACT_TYPE.SALE) {
        extraFields.paymentMethod = form.paymentMethod || null;
        extraFields.installments = form.installments
          ? Number(form.installments)
          : null;
        extraFields.installmentValue = form.installmentValue
          ? Number(form.installmentValue)
          : null;
        extraFields.notaria = form.notaria || null;
      }
      if (form.type === CONTRACT_TYPE.PROMISE) {
        extraFields.earnestMoney = form.earnestMoney
          ? Number(form.earnestMoney)
          : null;
      }

      // Modo de operación sugerido según tipo y forma de pago
      let operationMode;
      if (form.type === CONTRACT_TYPE.RENT) {
        operationMode = CONTRACT_OPERATION_MODE.STANDARD_RENT;
      } else if (form.type === CONTRACT_TYPE.SALE) {
        if (form.paymentMethod === 'credito') {
          operationMode = CONTRACT_OPERATION_MODE.MORTGAGE_SALE;
        } else if (form.paymentMethod === 'leasing') {
          operationMode = CONTRACT_OPERATION_MODE.LEASING_SALE;
        } else if (form.paymentMethod === 'contado') {
          operationMode = CONTRACT_OPERATION_MODE.DIRECT_SALE;
        } else {
          operationMode = CONTRACT_OPERATION_MODE.PROMISE_SALE;
        }
      } else if (form.type === CONTRACT_TYPE.PROMISE) {
        operationMode = CONTRACT_OPERATION_MODE.PROMISE_ONLY;
      }

      // Construir el bloque financial para que contract.service lo use
      // correctamente al generar pagos y al mostrar en el portal
      const financial = {
        baseValue: Number(form.value) || 0,
        currency: 'COP',
        paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
        adminFee: form.adminFee ? Number(form.adminFee) : 0,
        deposit: form.type === CONTRACT_TYPE.PROMISE
          ? (form.earnestMoney ? Number(form.earnestMoney) : 0)
          : (form.deposit ? Number(form.deposit) : 0),
        initialPayment: form.initialPayment ? Number(form.initialPayment) : 0,
        balance: 0,
        lastIncrementDate: null,
        nextIncrementDate: null,
        ipcRateApplied: null,
        billingFrequency: form.type === CONTRACT_TYPE.RENT ? 'mensual' : null,
      };

      const contractData = {
        type: form.type,
        status: form.status,
        operationMode,
        startDate: form.startDate,
        endDate: form.endDate || null,
        value: Number(form.value),
        currency: 'COP',
        financial,
        notes: form.notes || '',
        ...extraFields,

        // Propiedad
        propertyId: selectedProp.id,
        propertyName: selectedProp.title ?? '',
        propertyAddress:
          selectedProp.address ??
          selectedProp.location?.addressPublic ??
          selectedProp.location?.address ??
          selectedProp.city ??
          '',
        property: selectedProp,

        // Cliente
        clientId: selectedClient.id,
        clientName:
          selectedClient.displayName || selectedClient.email,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone || '',

        // Agente
        agentId: agentData.id || agentData.uid || '',
        agentName:
          agentData.displayName ||
          agentData.name ||
          agentData.email ||
          '',
        agentEmail: agentData.email || '',
      };

      const contractId = await contractService.createContract(
        contractData,
        currentUser?.email
      );

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
    { n: 2, label: 'Cliente', icon: FaUser },
    { n: 3, label: 'Contrato', icon: FaFileContract },
  ];

  const inputCls =
    'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary outline-none transition-colors';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        {STEPS.map(({ n, label, icon: Icon }, idx) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => n < step && setStep(n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                transition-colors w-full justify-center
                ${
                  step === n
                    ? 'bg-primary text-slate-950'
                    : n < step
                    ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-default'
                }`}
            >
              {n < step ? (
                <FaCheckCircle size={11} />
              ) : (
                <Icon size={11} />
              )}
              {label}
            </button>
            {idx < STEPS.length - 1 && (
              <FaChevronRight
                className="text-slate-600 flex-shrink-0"
                size={10}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <label className="block text-slate-300 text-sm font-semibold">
              <FaBuilding
                className="inline mr-1.5 text-slate-500"
                size={12}
              />
              Selecciona la propiedad
            </label>
            <AutocompleteField
              placeholder="Nombre, dirección o ciudad..."
              value={selectedProp}
              onSearch={setPropSearch}
              results={propResults}
              onSelect={(p) => {
                setSelectedProp(p);
                setPropResults([]);
                // Precargar precio SOLO si matchea el tipo del contrato actual:
                //   - arriendo → usa price.rent
                //   - venta/promesa → usa price.sale
                // Esto evita el bug de poner precio de venta como canon mensual.
                let priceToPreload = 0;
                if (form.type === CONTRACT_TYPE.RENT) {
                  priceToPreload = Number(p.price?.rent) || 0;
                } else {
                  priceToPreload = Number(p.price?.sale) || 0;
                }
                if (priceToPreload > 0) {
                  setForm((f) => ({
                    ...f,
                    value: f.value || String(priceToPreload),
                  }));
                }
              }}
              onClear={() => {
                setSelectedProp(null);
                setPropSearch('');
              }}
              loading={propLoading}
              renderItem={(p) => (
                <>
                  <p className="text-slate-200 text-sm font-medium">
                    {p.title}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {p.address ?? p.city}
                  </p>
                </>
              )}
              renderSelected={(p) => (
                <>
                  <p className="text-green-300 text-sm font-semibold">
                    {p.title}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {p.address ?? p.city}
                  </p>
                </>
              )}
            />
            <button
              onClick={() => selectedProp && setStep(2)}
              disabled={!selectedProp}
              className="w-full py-2.5 rounded-xl font-semibold text-sm bg-primary text-slate-950 hover:bg-primary/90
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Siguiente <FaChevronRight size={11} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <label className="block text-slate-300 text-sm font-semibold">
              <FaUser
                className="inline mr-1.5 text-slate-500"
                size={12}
              />
              Selecciona el cliente
            </label>
            <AutocompleteField
              placeholder="Nombre, email o teléfono..."
              value={selectedClient}
              onSearch={setClientSearch}
              results={clientResults}
              onSelect={(c) => {
                setSelectedClient(c);
                setClientResults([]);
              }}
              onClear={() => {
                setSelectedClient(null);
                setClientSearch('');
              }}
              loading={clientLoading}
              renderItem={(c) => (
                <>
                  <p className="text-slate-200 text-sm font-medium">
                    {c.displayName || c.email}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {c.email} {c.phone ? `· ${c.phone}` : ''}
                  </p>
                </>
              )}
              renderSelected={(c) => (
                <>
                  <p className="text-green-300 text-sm font-semibold">
                    {c.displayName || c.email}
                  </p>
                  <p className="text-slate-400 text-xs">{c.email}</p>
                </>
              )}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <FaChevronLeft size={11} /> Atrás
              </button>
              <button
                onClick={() => selectedClient && setStep(3)}
                disabled={!selectedClient}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-primary text-slate-950 hover:bg-primary/90
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                Siguiente <FaChevronRight size={11} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-xs mb-0.5">
                  Propiedad
                </p>
                <p className="text-slate-200 text-sm font-semibold truncate">
                  {selectedProp?.title}
                </p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-xs mb-0.5">
                  Cliente
                </p>
                <p className="text-slate-200 text-sm font-semibold truncate">
                  {selectedClient?.displayName ||
                    selectedClient?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                  Tipo *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    // Al cambiar tipo, reprecargar precio si propiedad ya está seleccionada
                    let newValue = form.value;
                    if (selectedProp) {
                      let price = 0;
                      if (newType === CONTRACT_TYPE.RENT) {
                        price = Number(selectedProp.price?.rent) || 0;
                      } else {
                        price = Number(selectedProp.price?.sale) || 0;
                      }
                      // Solo actualizar si el valor actual coincide con el precio
                      // antiguo de la propiedad (para no borrar lo que el usuario escribió)
                      const oldSale = Number(selectedProp.price?.sale) || 0;
                      const oldRent = Number(selectedProp.price?.rent) || 0;
                      const curVal = Number(form.value) || 0;
                      if (!curVal || curVal === oldSale || curVal === oldRent) {
                        newValue = price > 0 ? String(price) : '';
                      }
                    }
                    setForm((f) => ({
                      ...f,
                      type: newType,
                      value: newValue,
                      durationMonths: '',
                      incrementType: '',
                      paymentMethod: '',
                      installments: '',
                      installmentValue: '',
                      notaria: '',
                      earnestMoney: '',
                    }));
                  }}
                  className={inputCls}
                >
                  {Object.entries(CONTRACT_TYPE_LABELS).map(
                    ([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                  Estado inicial
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value,
                    }))
                  }
                  className={inputCls}
                >
                  {Object.entries(CONTRACT_STATUS_LABELS).map(
                    ([val, lbl]) => (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <ContractTypeFields
              type={form.type}
              form={form}
              setForm={setForm}
            />

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                <FaUserTie className="inline mr-1" size={10} />
                Agente responsable
              </label>
              <select
                value={selectedAgent?.id || ''}
                onChange={(e) => {
                  const agent = agents.find(
                    (a) => a.id === e.target.value
                  );
                  setSelectedAgent(agent || null);
                }}
                className={inputCls}
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

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                Notas internas
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="Condiciones especiales, observaciones..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                Documento PDF (opcional)
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-xl p-4
                  flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <FaUpload className="text-slate-500" size={14} />
                <span className="text-slate-400 text-xs flex-1 truncate">
                  {docFile
                    ? docFile.name
                    : 'Haz clic para adjuntar el contrato en PDF'}
                </span>
                {docFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocFile(null);
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) =>
                  setDocFile(e.target.files?.[0] ?? null)
                }
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <FaChevronLeft size={11} /> Atrás
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-primary text-slate-950 hover:bg-primary/90
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" size={12} />{' '}
                    Guardando...
                  </>
                ) : (
                  'Guardar contrato'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}