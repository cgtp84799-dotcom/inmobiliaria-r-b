// src/modules/contracts/services/contract.service.js
//
// Servicio central de contratos.
//
// Responsabilidades:
//  1. CRUD del documento /contracts/{id} usando SIEMPRE createContractPayload.
//  2. updateStatus / updateBusinessStage con escritura coherente de
//     status, statusGeneral, businessStage e historial.
//  3. _syncPropertyStatus: ÚNICO lugar donde se decide cómo una etapa de
//     contrato afecta el status de la propiedad. Llamado en cada cambio
//     relevante (no duplicar esta lógica en componentes).
//  4. Generación de milestones iniciales según el flujo del contrato.
//  5. Generación de payments iniciales para arriendo (cuotas mensuales).
//  6. Suscripciones por cliente/agente/propiedad, todas con `clientEmail`
//     normalizado (lowercase) para evitar mismatches de query.
//
// Subcolecciones manejadas aquí (CRUD detallado en contract.subcollections.service.js):
//   - history     (auditoría)
//   - milestones  (hitos del proceso)
//   - payments    (cuotas)
//   - documents   (archivos)
//   - alerts_sent (deduplicación de alertas — escrito por functions)

import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, writeBatch,
} from "firebase/firestore";
import {
  ref as storageRef, uploadBytes, getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../../core/config/firebase.config";

import {
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  CONTRACT_BUSINESS_STAGE,
  MILESTONE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_KIND,
  createContractPayload,
  buildContractSnapshot,
  buildInitialFinancialState,
  getStageSequenceByContract,
  getDefaultBusinessStage,
  getStageLabel,
  getStatusLabel,
  getTypeLabel,
  getPropertyStatusFromContract,
  resolveContractBusinessStage,
} from "../types/contract.types";

import { notificationService } from "../../notifications/services/notification.service";
import {
  sendClientNotification, NOTIF_TYPES,
} from "../../../core/services/notificationService";

const COL = "contracts";
const PROPERTIES_COL = "properties";

const col = () => collection(db, COL);
const ref_ = (id) => doc(db, COL, id);

const historyCol    = (id) => collection(db, COL, id, "history");
const milestonesCol = (id) => collection(db, COL, id, "milestones");
const paymentsCol   = (id) => collection(db, COL, id, "payments");

const norm = (e) => String(e || "").trim().toLowerCase();

// ─── Helpers internos ──────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, "0"); }
function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
// Parsear fecha YYYY-MM-DD sin desfase UTC (crea en zona local)
function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}
function diffMonths(start, end) {
  return (end.getFullYear() - start.getFullYear()) * 12 +
         (end.getMonth()    - start.getMonth());
}

// ─── Servicio ──────────────────────────────────────────────────────────────

export const contractService = {

  // ── 1. CREAR ────────────────────────────────────────────────────────────

  async createContract(data, createdByEmail) {
    // Snapshot de propiedad si llega objeto completo
    const propertySnapshot =
      data.propertySnapshot ||
      (data.property &&
        buildContractSnapshot(data.property, {
          propertyTitle: data.propertyName,
          propertyAddress: data.propertyAddress,
        }));

    const financial =
      data.financial ||
      buildInitialFinancialState({
        type: data.type || CONTRACT_TYPE.RENT,
        value: data.value,
        currency: data.currency || "COP",
        paymentDay: data.paymentDay,
        adminFee: data.adminFee,
        deposit: data.deposit,
        initialPayment: data.initialPayment,
        balance: data.balance,
      });

    const payloadBase = createContractPayload({
      ...data,
      propertySnapshot,
      financial,
      createdBy: createdByEmail,
    });

    const payload = {
      ...payloadBase,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(col(), payload);

    // Historial inicial
    addDoc(historyCol(docRef.id), {
      action: "created",
      status: payload.status,
      statusGeneral: payload.statusGeneral,
      businessStage: payload.businessStage,
      by: norm(createdByEmail) || "sistema",
      createdAt: serverTimestamp(),
    }).catch(() => {});

    // Solo generar milestones y payments si el contrato NO es borrador.
    const isDraft = payload.status === CONTRACT_STATUS.DRAFT;

    if (!isDraft) {
      this._createInitialMilestones(docRef.id, payload).catch((e) =>
        console.warn("[contractService] milestones:", e?.message)
      );

      if (payload.type === CONTRACT_TYPE.RENT) {
        this._createInitialRentPayments(docRef.id, payload).catch((e) =>
          console.warn("[contractService] payments:", e?.message)
        );
      }
    }

    // Sincronizar estado de la propiedad asociada
    this._syncPropertyStatus({ ...payload, id: docRef.id }).catch((e) =>
      console.warn("[contractService] syncPropertyStatus:", e?.message)
    );

    // Notificación al cliente (si no es borrador)
    if (payload.status !== CONTRACT_STATUS.DRAFT && payload.clientEmail) {
      sendClientNotification(payload.clientEmail, {
        title: "📄 Nuevo contrato registrado",
        message: `Se registró un contrato de ${payload.type} para "${payload.propertyName}". Puedes consultarlo en tu portal.`,
        type: NOTIF_TYPES.CONTRACT_CREATED,
        relatedId: docRef.id,
      }).catch(() => {});
    }

    // Notificación al agente
    if (payload.agentEmail && payload.agentEmail !== norm(createdByEmail)) {
      notificationService.createNotification({
        userId: payload.agentEmail,
        type: "contract_assigned",
        title: "Nuevo contrato asignado",
        message: `Se te asignó el contrato de "${payload.propertyName}" con ${payload.clientName}.`,
        actionUrl: "/contratos",
      }).catch(() => {});
    }

    // ── NUEVO: Notificar a todos los administradores ─────────────────────
    try {
      const adminsSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      const createdBy = norm(createdByEmail);
      const agent = norm(payload.agentEmail);

      await Promise.all(
        adminsSnap.docs
          .map((d) => d.id)
          .filter((adminEmail) => adminEmail !== createdBy && adminEmail !== agent)
          .map((adminEmail) =>
            notificationService.createNotification({
              userId: adminEmail,
              type: "new_contract",
              title: "📄 Nuevo contrato registrado",
              message: `Contrato de "${payload.propertyName}" con ${payload.clientName} (${getTypeLabel(payload.type)}) ha sido creado.`,
              relatedId: docRef.id,
              actionUrl: "/contratos",
            })
          )
      );
    } catch (e) {
      console.warn("[contractService] error notificando admins nuevo contrato:", e?.message);
    }

    return docRef.id;
  },

  // ── 2. CREAR MILESTONES INICIALES ────────────────────────────────────────

  async _createInitialMilestones(contractId, contractPayload) {
    const sequence = getStageSequenceByContract({
      type: contractPayload.type,
      operationMode: contractPayload.operationMode,
    });
    if (!sequence.length) return;

    const currentStage = contractPayload.businessStage;
    const currentIdx = Math.max(0, sequence.indexOf(currentStage));

    const tasks = sequence.map((stageKey, index) =>
      addDoc(milestonesCol(contractId), {
        key: stageKey,
        label: getStageLabel(stageKey),
        order: index,
        status:
          index < currentIdx ? MILESTONE_STATUS.DONE :
          index === currentIdx ? MILESTONE_STATUS.CURRENT :
          MILESTONE_STATUS.PENDING,
        completedAt: index < currentIdx ? serverTimestamp() : null,
        notes: "",
        doneBy: null,
        createdAt: serverTimestamp(),
      }).catch(() => null)
    );
    await Promise.all(tasks);

    const milestonesSummary = sequence.map((key, index) => ({
      key,
      order: index,
      status:
        index < currentIdx ? MILESTONE_STATUS.DONE :
        index === currentIdx ? MILESTONE_STATUS.CURRENT :
        MILESTONE_STATUS.PENDING,
    }));

    await updateDoc(ref_(contractId), {
      milestonesSummary,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  },

  // ── 3. CREAR PAYMENTS INICIALES PARA ARRIENDO ───────────────────────────

  async _createInitialRentPayments(contractId, contractPayload) {
    const { startDate, endDate, financial = {} } = contractPayload;
    if (!startDate || !endDate) return;

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end || end <= start) return;

    const totalMonths = Math.max(1, diffMonths(start, end));
    if (totalMonths > 60) {
      console.warn("[contractService] arriendo con más de 60 meses, saltando");
      return;
    }

    const canon = Number(financial.baseValue) || Number(contractPayload.value) || 0;
    const adminFee = Number(financial.adminFee) || 0;
    const paymentDay = Number(financial.paymentDay) || start.getDate();

    const startYear = start.getFullYear();
    const startMonth = start.getMonth(); // 0-indexed

    const batch = writeBatch(db);
    for (let i = 0; i < totalMonths; i++) {
      const monthOffset = startMonth + 1 + i;
      const year = startYear + Math.floor(monthOffset / 12);
      const month = monthOffset % 12;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(paymentDay, lastDay);
      const dueDate = `${year}-${pad2(month + 1)}-${pad2(day)}`;

      const paymentRef = doc(paymentsCol(contractId));
      batch.set(paymentRef, {
        kind: PAYMENT_KIND.RENT_CANON,
        order: i + 1,
        label: `Canon mes ${i + 1}`,
        amount: canon,
        adminFee,
        currency: contractPayload.currency || "COP",
        dueDate,
        status: PAYMENT_STATUS.PENDING,
        paidAt: null,
        paidAmount: 0,
        receiptUrl: null,
        notes: "",
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit().catch((e) => console.warn("[contractService] payments batch:", e?.message));
  },

  // ── 4. SINCRONIZAR ESTADO DE PROPIEDAD ──────────────────────────────────

  async _syncPropertyStatus(contract) {
    if (!contract?.propertyId) return;
    const newPropertyStatus = getPropertyStatusFromContract(contract);
    if (!newPropertyStatus) return;

    const isFreeing = newPropertyStatus === "disponible";

    try {
      const pRef = doc(db, PROPERTIES_COL, contract.propertyId);
      await updateDoc(pRef, {
        status: newPropertyStatus,
        currentContractId: isFreeing ? null : (contract.id || null),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("[contractService._syncPropertyStatus]", e?.message);
    }
  },

  // ── 5. UPDATES ──────────────────────────────────────────────────────────

  async updateContract(id, data) {
    const update = { ...data, updatedAt: serverTimestamp() };

    if (data.clientEmail !== undefined) update.clientEmail = norm(data.clientEmail);
    if (data.agentEmail  !== undefined) update.agentEmail  = norm(data.agentEmail);

    if (data.status) {
      update.statusGeneral = data.status;
      if (!data.businessStage && !data.keepBusinessStage) {
        const snap = await getDoc(ref_(id));
        if (snap.exists()) {
          const cur = snap.data();
          update.businessStage = getDefaultBusinessStage({
            type: cur.type,
            operationMode: cur.operationMode,
            status: data.status,
          });
        }
      }
    }

    await updateDoc(ref_(id), update);

    const fresh = await this.getContractById(id);
    if (fresh) this._syncPropertyStatus(fresh).catch(() => {});
  },

  async updateStatus(id, newStatus, notes = "", actorEmail = "") {
    const cur = await this.getContractById(id);
    if (!cur) throw new Error("Contrato no encontrado");

    const ALLOWED_TRANSITIONS = {
      [CONTRACT_STATUS.DRAFT]:     [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.CANCELLED],
      [CONTRACT_STATUS.ACTIVE]:    [CONTRACT_STATUS.PAUSED, CONTRACT_STATUS.COMPLETED, CONTRACT_STATUS.CANCELLED, CONTRACT_STATUS.EXPIRED],
      [CONTRACT_STATUS.PAUSED]:    [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.CANCELLED],
      [CONTRACT_STATUS.EXPIRED]:   [CONTRACT_STATUS.COMPLETED, CONTRACT_STATUS.CANCELLED],
      [CONTRACT_STATUS.COMPLETED]: [],
      [CONTRACT_STATUS.CANCELLED]: [],
    };
    const currentStatus = cur.statusGeneral || cur.status;
    if (currentStatus !== newStatus) {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Transición no permitida: ${currentStatus} → ${newStatus}. ` +
          `Estados válidos desde "${currentStatus}": ${allowed.join(", ") || "(ninguno — estado terminal)"}.`
        );
      }
    }

    const newBusinessStage = getDefaultBusinessStage({
      type: cur.type,
      operationMode: cur.operationMode,
      status: newStatus,
    });

    await updateDoc(ref_(id), {
      status: newStatus,
      statusGeneral: newStatus,
      businessStage: newBusinessStage,
      updatedAt: serverTimestamp(),
      ...(notes ? { lastStatusNote: notes } : {}),
    });

    addDoc(historyCol(id), {
      action: "status_change",
      from: cur.statusGeneral || cur.status,
      to: newStatus,
      businessStage: newBusinessStage,
      notes: notes || "",
      by: norm(actorEmail) || "sistema",
      createdAt: serverTimestamp(),
    }).catch(() => {});

    const wasDraft = (cur.statusGeneral || cur.status) === CONTRACT_STATUS.DRAFT;
    const isNowActive = newStatus === CONTRACT_STATUS.ACTIVE;

    if (wasDraft && isNowActive) {
      const existingMilestones = await getDocs(milestonesCol(id));
      if (existingMilestones.empty) {
        this._createInitialMilestones(id, { ...cur, businessStage: newBusinessStage })
          .catch((e) => console.warn("[updateStatus] milestones:", e?.message));
      }

      if (cur.type === CONTRACT_TYPE.RENT) {
        const existingPayments = await getDocs(paymentsCol(id));
        if (existingPayments.empty) {
          this._createInitialRentPayments(id, cur)
            .catch((e) => console.warn("[updateStatus] payments:", e?.message));
        }
      }
    }

    this._syncPropertyStatus({ ...cur, status: newStatus, statusGeneral: newStatus, businessStage: newBusinessStage })
      .catch(() => {});

    // Notificaciones existentes: cliente y agente
    const statusLabelLocal = {
      vigente: 'Vigente', borrador: 'Borrador', pausado: 'Pausado',
      vencido: 'Vencido', finalizado: 'Finalizado', cancelado: 'Cancelado',
    };
    const label = statusLabelLocal[newStatus] || newStatus;

    if (cur.clientEmail) {
      notificationService.createNotification({
        userId: cur.clientEmail,
        type: 'contract_status_changed',
        title: `Tu contrato cambió a: ${label}`,
        message: `El contrato de "${cur.propertyName}" ahora está ${label}.${notes ? ` Nota: ${notes}` : ''}`,
        actionUrl: '/portal',
      }).catch(() => {});
    }
    if (cur.agentEmail && cur.agentEmail !== norm(actorEmail)) {
      notificationService.createNotification({
        userId: cur.agentEmail,
        type: 'contract_status_changed',
        title: `Contrato actualizado: ${label}`,
        message: `El contrato de "${cur.propertyName}" con ${cur.clientName} cambió a ${label}.`,
        actionUrl: '/contratos',
      }).catch(() => {});
    }

    // ── NUEVO: Notificar a administradores sobre cambio de estado ───────
    try {
      const adminsSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      const actor = norm(actorEmail);
      const client = norm(cur.clientEmail);
      const agent = norm(cur.agentEmail);

      await Promise.all(
        adminsSnap.docs
          .map((d) => d.id)
          .filter((adminEmail) => adminEmail !== actor && adminEmail !== client && adminEmail !== agent)
          .map((adminEmail) =>
            notificationService.createNotification({
              userId: adminEmail,
              type: "contract_status_changed",
              title: `📌 Contrato ${label}`,
              message: `El contrato de "${cur.propertyName}" (${cur.clientName}) ha pasado a ${label}.`,
              relatedId: id,
              actionUrl: "/contratos",
            })
          )
      );
    } catch (e) {
      console.warn("[contractService] error notificando admins cambio estado:", e?.message);
    }
  },

  async updateBusinessStage(id, newStage, { notes = "", actorEmail = "" } = {}) {
    const cur = await this.getContractById(id);
    if (!cur) throw new Error("Contrato no encontrado");

    const curStatus = cur.statusGeneral || cur.status;
    let newStatus = curStatus;

    const ACTIVE_STAGES = [
      CONTRACT_BUSINESS_STAGE.RENT_SIGNED,
      CONTRACT_BUSINESS_STAGE.RENT_ACTIVE,
      CONTRACT_BUSINESS_STAGE.RENT_PAYMENT_DUE,
      CONTRACT_BUSINESS_STAGE.RENT_LATE,
      CONTRACT_BUSINESS_STAGE.RENT_RENEWAL_WINDOW,
      CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED,
      CONTRACT_BUSINESS_STAGE.SALE_INITIAL_PAYMENT,
      CONTRACT_BUSINESS_STAGE.SALE_FINANCING,
      CONTRACT_BUSINESS_STAGE.SALE_MORTGAGE_APPROVAL,
      CONTRACT_BUSINESS_STAGE.SALE_LEASING_APPROVAL,
      CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT,
      CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED,
      CONTRACT_BUSINESS_STAGE.SALE_REGISTERED,
      CONTRACT_BUSINESS_STAGE.SIGNED,
      CONTRACT_BUSINESS_STAGE.ACTIVE,
    ];
    const COMPLETED_STAGES = [
      CONTRACT_BUSINESS_STAGE.RENT_FINISHED,
      CONTRACT_BUSINESS_STAGE.SALE_DELIVERED,
      CONTRACT_BUSINESS_STAGE.COMPLETED,
    ];

    if (ACTIVE_STAGES.includes(newStage) && curStatus !== CONTRACT_STATUS.ACTIVE) {
      newStatus = CONTRACT_STATUS.ACTIVE;
    } else if (COMPLETED_STAGES.includes(newStage)) {
      newStatus = CONTRACT_STATUS.COMPLETED;
    }

    const statusChanged = newStatus !== curStatus;

    const updatePayload = {
      businessStage: newStage,
      updatedAt: serverTimestamp(),
    };
    if (statusChanged) {
      updatePayload.status = newStatus;
      updatePayload.statusGeneral = newStatus;
    }
    await updateDoc(ref_(id), updatePayload);

    addDoc(historyCol(id), {
      action: "stage_change",
      from: resolveContractBusinessStage(cur),
      to: newStage,
      ...(statusChanged ? { statusFrom: curStatus, statusTo: newStatus } : {}),
      notes: notes || "",
      by: norm(actorEmail) || "sistema",
      createdAt: serverTimestamp(),
    }).catch(() => {});

    if (statusChanged && curStatus === CONTRACT_STATUS.DRAFT && newStatus === CONTRACT_STATUS.ACTIVE) {
      const existingMilestones = await getDocs(milestonesCol(id));
      if (existingMilestones.empty) {
        this._createInitialMilestones(id, { ...cur, businessStage: newStage })
          .catch((e) => console.warn("[updateBusinessStage] milestones:", e?.message));
      }
      if (cur.type === CONTRACT_TYPE.RENT) {
        const existingPayments = await getDocs(paymentsCol(id));
        if (existingPayments.empty) {
          this._createInitialRentPayments(id, cur)
            .catch((e) => console.warn("[updateBusinessStage] payments:", e?.message));
        }
      }
    }

    try {
      const sequence = getStageSequenceByContract({ type: cur.type, operationMode: cur.operationMode });
      const newIdx = sequence.indexOf(newStage);
      if (newIdx >= 0) {
        const mSnap = await getDocs(milestonesCol(id));
        if (!mSnap.empty) {
          const batch = writeBatch(db);
          mSnap.docs.forEach((d) => {
            const data = d.data();
            const idx = sequence.indexOf(data.key);
            if (idx < 0) return;
            if (idx < newIdx) {
              batch.update(d.ref, {
                status: MILESTONE_STATUS.DONE,
                completedAt: data.completedAt || serverTimestamp(),
              });
            } else if (idx === newIdx) {
              batch.update(d.ref, { status: MILESTONE_STATUS.CURRENT });
            } else {
              batch.update(d.ref, { status: MILESTONE_STATUS.PENDING });
            }
          });
          await batch.commit().catch(() => {});
        }

        const milestonesSummary = sequence.map((key, idx) => ({
          key, order: idx,
          status:
            idx < newIdx ? MILESTONE_STATUS.DONE :
            idx === newIdx ? MILESTONE_STATUS.CURRENT :
            MILESTONE_STATUS.PENDING,
        }));
        await updateDoc(ref_(id), { milestonesSummary }).catch(() => {});
      }
    } catch (e) {
      console.warn("[contractService.updateBusinessStage] milestones sync:", e?.message);
    }

    this._syncPropertyStatus({ ...cur, businessStage: newStage, status: newStatus, statusGeneral: newStatus })
      .catch(() => {});

    // Notificaciones existentes: cliente y agente
    if (cur.clientEmail) {
      notificationService.createNotification({
        userId: cur.clientEmail,
        type: "contract_stage_changed",
        title: "Tu contrato avanzó",
        message: `El contrato de "${cur.propertyName}" pasó a la etapa: ${getStageLabel(newStage)}.`,
        actionUrl: "/portal",
      }).catch(() => {});
    }

    if (statusChanged && cur.agentEmail && cur.agentEmail !== norm(actorEmail)) {
      const statusLabelLocal = { vigente: 'Vigente', finalizado: 'Finalizado', cancelado: 'Cancelado' };
      notificationService.createNotification({
        userId: cur.agentEmail,
        type: "contract_status_changed",
        title: `Contrato ahora: ${statusLabelLocal[newStatus] || newStatus}`,
        message: `El contrato de "${cur.propertyName}" cambió automáticamente a ${statusLabelLocal[newStatus] || newStatus} al avanzar a ${getStageLabel(newStage)}.`,
        actionUrl: "/contratos",
      }).catch(() => {});
    }

    // ── NUEVO: Notificar a administradores sobre cambio de etapa ─────────
    try {
      const adminsSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      const stageLabel = getStageLabel(newStage);
      const actor = norm(actorEmail);
      const client = norm(cur.clientEmail);
      const agent = norm(cur.agentEmail);

      await Promise.all(
        adminsSnap.docs
          .map((d) => d.id)
          .filter((adminEmail) => adminEmail !== actor && adminEmail !== client && adminEmail !== agent)
          .map((adminEmail) =>
            notificationService.createNotification({
              userId: adminEmail,
              type: "contract_stage_changed",
              title: `🔄 Etapa de contrato: ${stageLabel}`,
              message: `El contrato de "${cur.propertyName}" (${cur.clientName}) ha avanzado a "${stageLabel}".`,
              relatedId: id,
              actionUrl: "/contratos",
            })
          )
      );
    } catch (e) {
      console.warn("[contractService] error notificando admins cambio etapa:", e?.message);
    }
  },

  // ── 6. DELETE / READS ───────────────────────────────────────────────────

  async deleteContract(id) {
    // ── NUEVO: Notificar antes de eliminar ──────────────────────────────
    try {
      const contractSnap = await getDoc(ref_(id));
      if (contractSnap.exists()) {
        const data = contractSnap.data();
        const propertyName = data.propertyName || 'Propiedad sin nombre';
        const clientName = data.clientName || 'Cliente desconocido';

        // Agente
        if (data.agentEmail) {
          await notificationService.createNotification({
            userId: data.agentEmail,
            type: 'contract_deleted',
            title: '🗑️ Contrato eliminado',
            message: `El contrato de "${propertyName}" con ${clientName} ha sido eliminado.`,
            actionUrl: '/contratos',
          }).catch(() => {});
        }

        // Administradores
        const adminsSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "admin"))
        );
        const agentEmail = norm(data.agentEmail);
        await Promise.all(
          adminsSnap.docs
            .map((d) => d.id)
            .filter((adminEmail) => adminEmail !== agentEmail)
            .map((adminEmail) =>
              notificationService.createNotification({
                userId: adminEmail,
                type: 'contract_deleted',
                title: '🗑️ Contrato eliminado',
                message: `El contrato de "${propertyName}" con ${clientName} fue eliminado.`,
                actionUrl: '/contratos',
              })
            )
        );
      }
    } catch (e) {
      console.warn("[contractService] error notificando eliminación contrato:", e?.message);
    }

    // Liberar propiedad antes de borrar
    try {
      const cur = await this.getContractById(id);
      if (cur?.propertyId) {
        await updateDoc(doc(db, PROPERTIES_COL, cur.propertyId), {
          status: "disponible",
          currentContractId: null,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    } catch { /* no romper el delete */ }

    const subcols = ["milestones", "payments", "documents", "history", "alerts_sent"];
    for (const sub of subcols) {
      try {
        const subSnap = await getDocs(collection(db, COL, id, sub));
        if (subSnap.empty) continue;
        const batches = [];
        let batch = writeBatch(db);
        let count = 0;
        for (const d of subSnap.docs) {
          batch.delete(d.ref);
          count++;
          if (count === 450) {
            batches.push(batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) batches.push(batch.commit());
        await Promise.all(batches);
      } catch (e) {
        console.warn(`[deleteContract] error limpiando ${sub}:`, e?.message);
      }
    }

    await deleteDoc(ref_(id));
  },

  async getContractById(id) {
    const snap = await getDoc(ref_(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async getAllContracts() {
    const snap = await getDocs(query(col(), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getContractsByProperty(propertyId) {
    const snap = await getDocs(
      query(col(), where("propertyId", "==", propertyId), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getActiveContractByProperty(propertyId) {
    const snap = await getDocs(
      query(col(), where("propertyId", "==", propertyId))
    );
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const blocking = all.find((c) => {
      const s = c.statusGeneral || c.status;
      return s === CONTRACT_STATUS.ACTIVE ||
             s === CONTRACT_STATUS.DRAFT ||
             s === CONTRACT_STATUS.PAUSED;
    });
    return blocking || null;
  },

  async getContractsByClient(clientEmail) {
    const snap = await getDocs(
      query(col(), where("clientEmail", "==", norm(clientEmail)), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getContractsByAgent(agentEmail) {
    const snap = await getDocs(
      query(col(), where("agentEmail", "==", norm(agentEmail)), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // ── 7. SUSCRIPCIONES ────────────────────────────────────────────────────

  subscribeAll(callback) {
    return onSnapshot(
      query(col(), orderBy("createdAt", "desc")),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("[contractService.subscribeAll]", err)
    );
  },

  subscribeByClient(clientEmail, callback) {
    return this.subscribeByClientEmail(clientEmail, callback);
  },

  subscribeByClientEmail(clientEmail, callback) {
    const email = norm(clientEmail);
    return onSnapshot(
      query(col(), where("clientEmail", "==", email)),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime?.() ?? a.createdAt?.seconds ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime?.() ?? b.createdAt?.seconds ?? 0;
          return tb - ta;
        });
        callback(docs);
      },
      (err) => console.error("[contractService.subscribeByClientEmail]", err)
    );
  },

  subscribeByAgent(agentEmail, callback) {
    const email = norm(agentEmail);
    return onSnapshot(
      query(col(), where("agentEmail", "==", email)),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
          return tb - ta;
        });
        callback(docs);
      },
      (err) => console.error("[contractService.subscribeByAgent]", err)
    );
  },

  subscribeOne(id, callback) {
    return onSnapshot(
      ref_(id),
      (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => console.error("[contractService.subscribeOne]", err)
    );
  },

  // ── 8. PDF principal del contrato ───────────────────────────────────────

  async uploadDocument(contractId, file) {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `contracts/${contractId}/${Date.now()}.${ext}`;
    const sRef = storageRef(storage, path);
    const snap = await uploadBytes(sRef, file);
    const url = await getDownloadURL(snap.ref);
    await updateDoc(ref_(contractId), {
      documentUrl: url,
      updatedAt: serverTimestamp(),
    });
    return url;
  },
};