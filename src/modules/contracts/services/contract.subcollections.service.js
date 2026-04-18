// src/modules/contracts/services/contract.subcollections.service.js
//
// CRUD y suscripciones para las subcolecciones de un contrato:
//   /contracts/{id}/milestones
//   /contracts/{id}/payments
//   /contracts/{id}/documents
//   /contracts/{id}/history
//
// Se mantiene aparte de contract.service para no inflarlo y porque la
// UI consume estas subcolecciones de forma reactiva por pestañas.

import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import {
  ref as storageRef, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../core/config/firebase.config";
import {
  PAYMENT_STATUS, MILESTONE_STATUS, DOCUMENT_KIND,
} from "../types/contract.types";

const COL = "contracts";
const sub = (id, name) => collection(db, COL, id, name);

// ─── MILESTONES ─────────────────────────────────────────────────────────────

export const milestoneService = {
  subscribe(contractId, cb) {
    return onSnapshot(
      query(sub(contractId, "milestones"), orderBy("order", "asc")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error("[milestoneService.subscribe]", e)
    );
  },
  async list(contractId) {
    const snap = await getDocs(query(sub(contractId, "milestones"), orderBy("order", "asc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async update(contractId, milestoneId, data) {
    await updateDoc(doc(db, COL, contractId, "milestones", milestoneId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },
  async markDone(contractId, milestoneId, actorEmail = "") {
    await updateDoc(doc(db, COL, contractId, "milestones", milestoneId), {
      status: MILESTONE_STATUS.DONE,
      completedAt: serverTimestamp(),
      doneBy: actorEmail || "sistema",
    });
  },
};

// ─── PAYMENTS ───────────────────────────────────────────────────────────────

export const paymentService = {
  subscribe(contractId, cb) {
    return onSnapshot(
      query(sub(contractId, "payments"), orderBy("order", "asc")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error("[paymentService.subscribe]", e)
    );
  },
  async list(contractId) {
    const snap = await getDocs(query(sub(contractId, "payments"), orderBy("order", "asc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async create(contractId, data) {
    const ref = await addDoc(sub(contractId, "payments"), {
      status: PAYMENT_STATUS.PENDING,
      paidAt: null,
      paidAmount: 0,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },
  async update(contractId, paymentId, data) {
    await updateDoc(doc(db, COL, contractId, "payments", paymentId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },
  async markPaid(contractId, paymentId, { paidAmount, receiptUrl, notes, actorEmail } = {}) {
    await updateDoc(doc(db, COL, contractId, "payments", paymentId), {
      status: PAYMENT_STATUS.PAID,
      paidAt: serverTimestamp(),
      paidAmount: Number(paidAmount) || 0,
      receiptUrl: receiptUrl || null,
      notes: notes || "",
      paidBy: actorEmail || "sistema",
      updatedAt: serverTimestamp(),
    });
  },
  async remove(contractId, paymentId) {
    await deleteDoc(doc(db, COL, contractId, "payments", paymentId));
  },
};

// ─── DOCUMENTS ──────────────────────────────────────────────────────────────

export const contractDocumentService = {
  subscribe(contractId, cb) {
    return onSnapshot(
      query(sub(contractId, "documents"), orderBy("createdAt", "desc")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error("[contractDocumentService.subscribe]", e)
    );
  },
  async list(contractId) {
    const snap = await getDocs(query(sub(contractId, "documents"), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async upload(contractId, file, { kind = DOCUMENT_KIND.OTHER, label = "", uploadedBy = "" } = {}) {
    if (!file) throw new Error("Archivo requerido");
    const ext = file.name.split(".").pop();
    const path = `contracts/${contractId}/docs/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const snap = await uploadBytes(sRef, file);
    const url = await getDownloadURL(snap.ref);
    const ref = await addDoc(sub(contractId, "documents"), {
      kind,
      label: label || file.name,
      filename: file.name,
      ext,
      size: file.size,
      mimeType: file.type,
      url,
      storagePath: path,
      uploadedBy,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, url };
  },
  async remove(contractId, documentId) {
    const dRef = doc(db, COL, contractId, "documents", documentId);
    const snap = await getDoc(dRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.storagePath) {
        try { await deleteObject(storageRef(storage, data.storagePath)); } catch { /* ya eliminado */ }
      }
    }
    await deleteDoc(dRef);
  },
};

// ─── HISTORY ────────────────────────────────────────────────────────────────

export const historyService = {
  subscribe(contractId, cb) {
    return onSnapshot(
      query(sub(contractId, "history"), orderBy("createdAt", "desc")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error("[historyService.subscribe]", e)
    );
  },
  async log(contractId, entry) {
    await addDoc(sub(contractId, "history"), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  },
};