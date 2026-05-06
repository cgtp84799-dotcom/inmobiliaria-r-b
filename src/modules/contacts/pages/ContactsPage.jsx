import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaEnvelope,
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaWhatsapp,
  FaSpinner,
  FaArchive,
  FaUserPlus,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";
import toast from "react-hot-toast";

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [processingId, setProcessingId] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [contactToArchive, setContactToArchive] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contactsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
          updatedAt: d.data().updatedAt?.toDate(),
        }));
        setContacts(contactsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error cargando consultas:", error);
        toast.error("Error al cargar las consultas");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const markAsContacted = async (contactId) => {
    setProcessingId(contactId);
    try {
      await updateDoc(doc(db, "contacts", contactId), {
        status: "contacted",
        updatedAt: new Date(),
      });
      toast.success("Marcado como contactado");
    } catch (error) {
      console.error("Error actualizando estado:", error);
      toast.error("Error al actualizar");
    } finally {
      setProcessingId(null);
    }
  };
  const closeAndCreateClient = async (contact) => {
    setProcessingId(contact.id);

    try {
      const clientData = {
        nombre: contact.name,
        email: contact.email,
        telefono: contact.phone,
        tipoCliente: "Lead",
        estado: "Activo",
        presupuesto: "",
        tipoPropiedad: "",
        ubicacionInteres: "",
        notas: contact.message || "Contacto desde formulario web",
        propiedadVinculada: contact.propertyId || "",
        fechaRegistro: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdFrom: "contact_inquiry",
        source: "web_contact_form",
        interestedProperty: contact.propertyId || null,
        interestedPropertyTitle: contact.propertyTitle || null,
      };

      const clientRef = doc(collection(db, "clients"));
      await setDoc(clientRef, clientData);

      await updateDoc(doc(db, "contacts", contact.id), {
        status: "closed",
        closedAt: new Date(),
        convertedToClientId: clientRef.id,
        updatedAt: new Date(),
      });

      toast.success("✅ Consulta cerrada y cliente creado en el CRM");
    } catch (error) {
      console.error("❌ Error cerrando consulta:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openArchiveModal = (contact) => {
    setContactToArchive(contact);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!contactToArchive) return;

    setProcessingId(contactToArchive.id);
    try {
      await deleteDoc(doc(db, "contacts", contactToArchive.id));
      toast.success("✅ Consulta archivada correctamente");
      setShowArchiveModal(false);
      setContactToArchive(null);
    } catch (error) {
      console.error("Error archivando consulta:", error);
      toast.error("❌ Error al archivar la consulta");
    } finally {
      setProcessingId(null);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setContactToArchive(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: FaClock,
        text: "Pendiente",
        class: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
      },
      contacted: {
        icon: FaCheckCircle,
        text: "Contactado",
        class: "bg-blue-500/15 text-blue-300 border-blue-500/25",
      },
      closed: {
        icon: FaCheckCircle,
        text: "Cerrado",
        class: "bg-green-500/15 text-green-300 border-green-500/25",
      },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold border ${badge.class}`}
      >
        <Icon size={12} />
        {badge.text}
      </span>
    );
  };

  const stats = useMemo(() => {
    const pending = contacts.filter((c) => c.status === "pending").length;
    const contacted = contacts.filter((c) => c.status === "contacted").length;
    const closed = contacts.filter((c) => c.status === "closed").length;
    return { pending, contacted, closed };
  }, [contacts]);

  const filteredContacts = contacts.filter((contact) => contact.status === filter);

  const formatDate = (date) => {
    if (!date) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <FaSpinner className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="card-soft p-4 sm:p-6 border border-[var(--color-border)]/80">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--color-text)]">
              Consultas de clientes
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm sm:text-base mt-1">
              Gestiona las consultas recibidas desde el sitio web.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">Pend.</p>
              <p className="text-sm sm:text-lg font-extrabold text-yellow-300">{stats.pending}</p>
            </div>
            <div className="bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">Cont.</p>
              <p className="text-sm sm:text-lg font-extrabold text-blue-300">{stats.contacted}</p>
            </div>
            <div className="bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">Hist.</p>
              <p className="text-sm sm:text-lg font-extrabold text-green-300">{stats.closed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros (compactos en móvil) */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => setFilter("pending")}
          className={`px-3 sm:px-5 py-2 rounded-xl font-semibold transition-all text-xs sm:text-sm ${
            filter === "pending"
              ? "bg-yellow-500 text-slate-950 shadow-lg"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          }`}
        >
          <FaClock className="inline mr-2" />
          Pendientes ({stats.pending})
        </button>

        <button
          onClick={() => setFilter("contacted")}
          className={`px-3 sm:px-5 py-2 rounded-xl font-semibold transition-all text-xs sm:text-sm ${
            filter === "contacted"
              ? "bg-blue-600 text-[var(--color-text)] shadow-lg"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          }`}
        >
          <FaCheckCircle className="inline mr-2" />
          Contactados ({stats.contacted})
        </button>

        <button
          onClick={() => setFilter("closed")}
          className={`px-3 sm:px-5 py-2 rounded-xl font-semibold transition-all text-xs sm:text-sm ${
            filter === "closed"
              ? "bg-green-600 text-[var(--color-text)] shadow-lg"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          }`}
        >
          <FaArchive className="inline mr-2" />
          Historial ({stats.closed})
        </button>
      </div>

      {/* Lista */}
      {filteredContacts.length === 0 ? (
        <div className="card-soft border border-[var(--color-border)] rounded-2xl p-8 sm:p-12 text-center">
          <FaEnvelope className="text-[var(--color-text-faint)] text-4xl sm:text-5xl mx-auto mb-4" />
          <p className="text-[var(--color-text)] text-sm sm:text-lg">
            No hay consultas{" "}
            {filter === "pending"
              ? "pendientes"
              : filter === "contacted"
              ? "contactadas"
              : "en el historial"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredContacts.map((contact) => {
            const isProcessing = processingId === contact.id;
            const phoneDigits = String(contact.phone || "").replace(/\D/g, "");

            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--color-surface)]/70 border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 hover:border-primary/50 transition-all"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-extrabold text-[var(--color-text)] flex items-center gap-2 truncate">
                      <FaUser className="text-primary flex-shrink-0" size={16} />
                      <span className="truncate">{contact.name || "Sin nombre"}</span>
                    </h3>

                    {contact.propertyTitle && (
                      <p className="text-[var(--color-text-muted)] text-xs sm:text-sm mt-1">
                        Interesado en:{" "}
                        <span className="text-primary font-semibold">
                          {contact.propertyTitle}
                        </span>
                      </p>
                    )}
                  </div>

                  {getStatusBadge(contact.status)}
                </div>

                {/* Info (en móvil se compacta mejor) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                  <div className="text-[var(--color-text)] text-xs sm:text-sm flex items-center gap-2 min-w-0">
                    <FaEnvelope className="text-primary flex-shrink-0" size={14} />
                    <a
                      href={`mailto:${contact.email}`}
                      className="hover:text-primary transition-colors truncate"
                    >
                      {contact.email}
                    </a>
                  </div>

                  <div className="text-[var(--color-text)] text-xs sm:text-sm flex items-center gap-2">
                    <FaPhone className="text-primary flex-shrink-0" size={14} />
                    <a
                      href={`tel:${contact.phone}`}
                      className="hover:text-primary transition-colors"
                    >
                      {contact.phone}
                    </a>
                  </div>

                  <div className="text-[var(--color-text-muted)] text-[11px] sm:text-sm flex items-center gap-2 sm:col-span-2">
                    <FaCalendarAlt className="text-[var(--color-text-muted)] flex-shrink-0" size={14} />
                    {formatDate(contact.createdAt)}
                  </div>
                </div>

                {/* Mensaje */}
                {contact.message && (
                  <div className="bg-[var(--color-bg)]/40 border border-[var(--color-border)] rounded-xl p-3 sm:p-4 mb-3">
                    <p className="text-[var(--color-text)] text-xs sm:text-sm leading-relaxed break-words">
                      {contact.message}
                    </p>
                  </div>
                )}

                {/* Acciones: en móvil -> 2 columnas / en desktop -> columna */}
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  <a
                    href={`https://wa.me/57${phoneDigits}?text=Hola ${
                      contact.name || ""
                    }, te contactamos desde Rincón Bedoya & Asociados`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm
                               bg-green-600 hover:bg-green-700 text-[var(--color-text)]"
                  >
                    <FaWhatsapp />
                    WhatsApp
                  </a>

                  {contact.status === "pending" && (
                    <button
                      onClick={() => markAsContacted(contact.id)}
                      disabled={isProcessing}
                      className="px-4 py-2.5 rounded-xl font-semibold transition-all text-xs sm:text-sm
                                 bg-blue-600 hover:bg-blue-700 text-[var(--color-text)] disabled:opacity-50 flex items-center justify-center"
                    >
                      {isProcessing ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        "Marcar contactado"
                      )}
                    </button>
                  )}

                  {contact.status === "contacted" && (
                    <button
                      onClick={() => closeAndCreateClient(contact)}
                      disabled={isProcessing}
                      className="col-span-2 lg:col-span-1 px-4 py-2.5 rounded-xl font-semibold transition-all text-xs sm:text-sm
                                 bg-primary hover:bg-yellow-500 text-slate-950 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FaUserPlus />
                          Cerrar y crear cliente
                        </>
                      )}
                    </button>
                  )}

                  {contact.status === "closed" && (
                    <button
                      onClick={() => openArchiveModal(contact)}
                      disabled={isProcessing}
                      className="col-span-2 lg:col-span-1 px-4 py-2.5 rounded-xl font-semibold transition-all text-xs sm:text-sm
                                 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] text-[var(--color-text)] border border-[var(--color-border)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <FaArchive />
                      Archivar
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal confirmación */}
      <AnimatePresence>
        {showArchiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={cancelArchive}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-500 text-2xl sm:text-3xl" />
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] text-center mb-2">
                ¿Archivar consulta?
              </h3>

              <p className="text-[var(--color-text-muted)] text-center text-sm sm:text-base mb-5 sm:mb-6">
                Esta acción eliminará permanentemente la consulta de{" "}
                <span className="text-primary font-semibold">
                  {contactToArchive?.name}
                </span>
                . No se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelArchive}
                  disabled={processingId === contactToArchive?.id}
                  className="flex-1 px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] text-[var(--color-text)] rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmArchive}
                  disabled={processingId === contactToArchive?.id}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-[var(--color-text)] rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === contactToArchive?.id ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <FaArchive />
                      Archivar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactsPage;