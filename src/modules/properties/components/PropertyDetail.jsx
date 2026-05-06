import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";
import PropertyMap from "../../properties/components/PropertyMap";
import PropertyPrintView from "./PropertyPrintView";
import PropertyClientPrint  from "./PropertyClientPrint";
import {
  FaTimes,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaBed,
  FaBath,
  FaCar,
  FaRulerCombined,
  FaCalendar,
  FaHome,
  FaChevronLeft,
  FaChevronRight,
  FaSearchPlus,
  FaFileDownload,
  FaFilePdf,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaPercentage,
  FaCheckCircle,
  FaBalanceScale,
  FaStickyNote,
  FaFileContract,
  FaBuilding,
  FaExclamationTriangle,
  FaDollarSign,
  FaLayerGroup,
  FaUserTie,
  FaCalendarAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import ConfirmModal from "../../../shared/components/UI/ConfirmModal";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatPrice = (price) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price || 0);

const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Separador de sub-sección (igual que en PropertyForm)
const SubDivider = ({ label }) => (
  <div className="flex items-center gap-2 pt-3 pb-1">
    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-[var(--color-surface)]" />
  </div>
);

// Fila de dato individual (label + valor)
const InfoRow = ({ label, value, mono = false }) => {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[var(--color-text-muted)] text-xs mb-0.5">{label}</p>
      <p className={`text-[var(--color-text)] text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
};

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const PropertyDetail = ({ property, onClose, onEdit, onDelete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal]         = useState(false);
  const [isDeleting, setIsDeleting]                 = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded]   = useState(false);
  const [confirmModal, setConfirmModal]             = useState(false);
  const [showClientPrint, setShowClientPrint] = useState(false);
  const [showAdminPrint,  setShowAdminPrint]  = useState(false);
  const [activeContract, setActiveContract]   = useState(null);

  // ── Cargar contrato activo de esta propiedad ───
  useEffect(() => {
    if (!property?.id) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'contracts'), where('propertyId', '==', property.id))
        );
        const blocking = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .find((c) => {
            const s = c.statusGeneral || c.status;
            return s === 'vigente' || s === 'borrador' || s === 'pausado';
          });
        setActiveContract(blocking || null);
      } catch { setActiveContract(null); }
    })();
  }, [property?.id]);

  // ── Bloquear scroll ─────────────────────────
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow  = "hidden";
    document.body.style.position  = "fixed";
    document.body.style.top       = `-${scrollY}px`;
    document.body.style.width     = "100%";
    return () => {
      document.body.style.overflow  = "";
      document.body.style.position  = "";
      document.body.style.top       = "";
      document.body.style.width     = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // ── Cerrar con ESC ───────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!property) return null;

  const images    = property.images    || [];
  const documents = property.documents || [];
  const amenities = [
    ...(property.amenities       || []),
    ...(property.customAmenities || []),
  ].filter(Boolean);

  const AMENITIES_LIMIT = 10;
  const visibleAmenities = amenitiesExpanded
    ? amenities
    : amenities.slice(0, AMENITIES_LIMIT);

  const nextImage = () =>
    setCurrentImageIndex((p) => (p + 1) % images.length);
  const prevImage = () =>
    setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

  const calculateCommission = () => {
    const price      = parseFloat(property.price)                || 0;
    const percentage = parseFloat(property.commissionPercentage) || 0;
    return price * (percentage / 100);
  };


  const confirmDelete = async () => {
    setConfirmModal(false);
    setIsDeleting(true);
    try {
      await onDelete(property.id);
      toast.success("Propiedad eliminada");
      onClose?.();
    } catch (error) {
      // "contrato activo asociado"), mostrarlo. Antes siempre era genérico.
      const msg = error?.message && error.message.length < 200
        ? error.message
        : "Error al eliminar";
      toast.error(msg);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Flags de visibilidad ─────────────────────
  const hasLegal =
    property.cadastralReference    ||
    property.registrationNumber    ||
    property.legalStatus           ||
    property.publicDeedNumber      ||
    property.registeredOwner       ||
    property.cadastralAppraisal    ||
    property.liensAndLimitations   ||
    property.horizontalProperty;

  const hasCosts =
    property.propertyTax       ||
    property.administrationFee ||
    property.rentalDeposit     ||
    property.minimumRentalPeriod;

  const hasNotes =
    property.propertyObservations ||
    property.ownerRecommendations;

  // ── Sub-componentes locales ──────────────────
  const StatusBadge = ({ status }) => {
    const colors = {
      disponible: "bg-green-500/20 text-green-400 border-green-500/30",
      reservada:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      arrendada:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
      vendida:    "bg-red-500/20 text-red-400 border-red-500/30",
      inactiva:   "bg-slate-500/20 text-[var(--color-text-muted)] border-slate-500/30",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${
          colors[status] || colors.disponible
        }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Disponible"}
      </span>
    );
  };

  // ─────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────
  return (
    <>
      {/* ══ Modal Principal ══════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overscroll-contain"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto overscroll-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header sticky ── */}
          <div className="sticky top-0 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border)] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 z-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <h2 className="text-lg sm:text-2xl font-bold text-primary truncate">
                  {property.title}
                </h2>
                <StatusBadge status={property.status} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 hidden sm:block">
                ID: {property.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <FaTimes className="text-light" />
            </button>
          </div>

          {/* ── Contrato activo vinculado ── */}
          {activeContract && (
            <div className={`mx-4 sm:mx-6 mt-4 p-4 border rounded-xl ${
              activeContract.statusGeneral === 'vigente'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-slate-500/10 border-slate-500/20'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FaFileContract className={`${activeContract.statusGeneral === 'vigente' ? 'text-emerald-400' : 'text-[var(--color-text-muted)]'}`} size={14} />
                  <span className={`text-sm font-bold ${activeContract.statusGeneral === 'vigente' ? 'text-emerald-400' : 'text-[var(--color-text-muted)]'}`}>
                    {activeContract.type === 'arriendo' ? 'Arriendo' : activeContract.type === 'venta' ? 'Venta' : 'Promesa'} · {
                      activeContract.statusGeneral === 'vigente' ? 'Vigente' :
                      activeContract.statusGeneral === 'borrador' ? 'Borrador' : 'Pausado'
                    }
                  </span>
                </div>
                {activeContract.value > 0 && (
                  <span className="text-primary font-bold text-sm">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(activeContract.value)}
                    {activeContract.type === 'arriendo' ? ' /mes' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                {activeContract.clientName && (
                  <div className="flex items-center gap-2 text-[var(--color-text)]">
                    <FaUser size={10} className="text-[var(--color-text-muted)]" />
                    <span><strong>{activeContract.type === 'arriendo' ? 'Arrendatario:' : 'Comprador:'}</strong> {activeContract.clientName}</span>
                  </div>
                )}
                {activeContract.clientEmail && (
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <FaEnvelope size={10} className="text-[var(--color-text-muted)]" />
                    <span>{activeContract.clientEmail}</span>
                  </div>
                )}
                {activeContract.agentName && (
                  <div className="flex items-center gap-2 text-[var(--color-text)]">
                    <FaUserTie size={10} className="text-[var(--color-text-muted)]" />
                    <span><strong>Agente:</strong> {activeContract.agentName}</span>
                  </div>
                )}
                {activeContract.startDate && (
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <FaCalendarAlt size={10} className="text-[var(--color-text-muted)]" />
                    <span>{activeContract.startDate}{activeContract.endDate ? ` → ${activeContract.endDate}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Contenido ── */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              {/* ══════════════════════════════════════
                  COLUMNA IZQUIERDA (lg:col-span-2)
              ══════════════════════════════════════ */}
              <div className="lg:col-span-2 space-y-5 sm:space-y-6">

                {/* Galería */}
                {images.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative bg-[var(--color-surface)] rounded-xl overflow-hidden group">
                      <div className="relative aspect-video">
                        <img
                          src={images[currentImageIndex]}
                          alt={`${property.title} — imagen ${currentImageIndex + 1}`}
                          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                          onClick={() => setShowImageModal(true)}
                          loading="lazy"
                        />
                      </div>

                      <button
                        onClick={() => setShowImageModal(true)}
                        className="absolute top-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-xl flex items-center justify-center transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Ampliar imagen"
                      >
                        <FaSearchPlus className="text-[var(--color-text)]" />
                      </button>

                      {images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                            aria-label="Anterior"
                          >
                            <FaChevronLeft className="text-[var(--color-text)]" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                            aria-label="Siguiente"
                          >
                            <FaChevronRight className="text-[var(--color-text)]" />
                          </button>
                        </>
                      )}

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-[var(--color-text)] text-xs">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </div>

                    {images.length > 1 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                              currentImageIndex === i
                                ? "border-primary ring-2 ring-primary/40"
                                : "border-[var(--color-border)] hover:border-slate-600"
                            }`}
                            aria-label={`Miniatura ${i + 1}`}
                          >
                            <img
                              src={img}
                              alt={`Miniatura ${i + 1}`}
                              className="w-full h-16 object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[var(--color-surface)] rounded-xl aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <FaHome className="text-5xl sm:text-6xl text-[var(--color-text-faint)] mx-auto mb-3" />
                      <p className="text-[var(--color-text-muted)] text-sm">Sin imágenes</p>
                    </div>
                  </div>
                )}

                {/* Descripción */}
                <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-light mb-3">
                    Descripción
                  </h3>
                  <p className="text-[var(--color-text)] text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {property.description || "Sin descripción disponible."}
                  </p>
                </div>

                {/* Características */}
                <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-light mb-4">
                    Características
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { val: property.area,         label: "Área total",       icon: FaRulerCombined, unit: "m²" },
                      { val: property.builtArea,    label: "Área construida",  icon: FaHome,          unit: "m²" },
                      { val: property.rooms,        label: "Habitaciones",     icon: FaBed,           unit: "" },
                      { val: property.bathrooms,    label: "Baños",            icon: FaBath,          unit: "" },
                      { val: property.parkingSpots, label: "Parqueaderos",     icon: FaCar,           unit: "" },
                      { val: property.floors,       label: "Pisos",            icon: FaLayerGroup,    unit: "" },
                      { val: property.yearBuilt,    label: "Año construcción", icon: FaCalendar,      unit: "" },
                      { val: property.stratum,      label: "Estrato",          icon: FaCheckCircle,   unit: "" },
                    ]
                      .filter((f) => f.val)
                      .map(({ val, label, icon: Icon, unit }) => (
                        <div
                          key={label}
                          className="bg-[var(--color-surface)]/50 rounded-lg p-3 sm:p-4 text-center"
                        >
                          <Icon className="text-xl sm:text-2xl text-primary mx-auto mb-2" />
                          <p className="text-[var(--color-text-muted)] text-xs sm:text-sm">{label}</p>
                          <p className="text-light font-bold text-sm sm:text-base">
                            {val}{unit && ` ${unit}`}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Amenidades */}
                {amenities.length > 0 && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-lg sm:text-xl font-bold text-light">
                        Amenidades
                      </h3>
                      {amenities.length > AMENITIES_LIMIT && (
                        <button
                          type="button"
                          onClick={() => setAmenitiesExpanded((v) => !v)}
                          className="text-xs px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary font-semibold hover:bg-primary/15 transition"
                        >
                          {amenitiesExpanded
                            ? "Ver menos"
                            : `Ver todas (${amenities.length})`}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {visibleAmenities.map((amenity, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-2 bg-[var(--color-surface)]/60 border border-[var(--color-border)] rounded-lg"
                        >
                          <FaCheckCircle className="text-primary text-sm flex-shrink-0" />
                          <span className="text-[var(--color-text)] text-xs leading-snug line-clamp-2">
                            {amenity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!amenitiesExpanded && amenities.length > AMENITIES_LIMIT && (
                      <p className="text-[var(--color-text-muted)] text-xs mt-3">
                        Mostrando {AMENITIES_LIMIT} de {amenities.length}.
                      </p>
                    )}
                  </div>
                )}

                {/* Ubicación */}
                <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-light mb-4 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary" /> Ubicación
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <InfoRow label="Dirección"    value={property.address} />
                    <InfoRow label="Barrio / Vereda" value={property.neighborhood} />
                    <InfoRow label="Ciudad"       value={property.city} />
                    <InfoRow label="Departamento" value={property.department} />
                  </div>
                  <div className="bg-[var(--color-surface)] rounded-lg h-64 overflow-hidden">
                    <PropertyMap
                      address={property.address}
                      city={property.city}
                      department={property.department}
                      neighborhood={property.neighborhood}
                      latitude={property.latitude}
                      longitude={property.longitude}
                    />
                  </div>
                </div>

                {/* Documentos */}
                {documents.length > 0 && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-light mb-4">
                      Documentos Legales
                    </h3>
                    <div className="space-y-2">
                      {documents.map((doc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 p-3 bg-[var(--color-surface)]/50 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FaFilePdf className="text-red-400 text-xl flex-shrink-0" />
                            <span className="text-light truncate text-sm">{doc.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              window.open(doc.url, "_blank");
                              toast.success(`Descargando ${doc.name}`);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-[var(--color-text)] rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 text-sm"
                          >
                            <FaFileDownload /> Descargar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════
                  COLUMNA DERECHA
              ══════════════════════════════════════ */}
              <div className="space-y-4">

                {/* Precio */}
                <div className="bg-gradient-to-br from-primary/20 to-yellow-500/20 border border-primary/30 rounded-xl p-5 sm:p-6">
                  <p className="text-[var(--color-text-muted)] text-xs sm:text-sm mb-1">
                    {property.transactionType === "venta"
                      ? "Precio de venta"
                      : "Canon de arriendo"}
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </p>
                  {property.transactionType === "arriendo" && (
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">/mes</p>
                  )}
                </div>

                {/* Comisión */}
                {property.commissionPercentage && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaPercentage className="text-primary" />
                      <h4 className="text-light font-bold">Comisión</h4>
                    </div>
                    <p className="text-[var(--color-text-muted)] text-sm">{property.commissionPercentage}%</p>
                    <p className="text-2xl font-bold text-primary mt-2">
                      {formatPrice(calculateCommission())}
                    </p>
                  </div>
                )}

                {/* Tipo */}
                <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
                  <p className="text-[var(--color-text-muted)] text-xs mb-1">Tipo de propiedad</p>
                  <p className="text-light font-bold capitalize">{property.type}</p>
                </div>

                {/* Propietario */}
                {property.ownerName && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaUser className="text-primary" />
                      <h4 className="text-light font-bold">Contacto del propietario</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-[var(--color-text)] font-semibold">{property.ownerName}</p>
                      {property.ownerPhone && (
                        <a
                          href={`tel:${property.ownerPhone}`}
                          className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-primary transition-colors"
                        >
                          <FaPhone className="text-xs" />
                          {property.ownerPhone}
                        </a>
                      )}
                      {property.ownerEmail && (
                        <a
                          href={`mailto:${property.ownerEmail}`}
                          className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-primary transition-colors break-all"
                        >
                          <FaEnvelope className="text-xs" />
                          {property.ownerEmail}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* ── INFORMACIÓN JURÍDICA ──────────────── */}
                {hasLegal && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaBalanceScale className="text-red-400" />
                      <h4 className="text-light font-bold">Información Jurídica</h4>
                    </div>

                    {/* Identificación registral */}
                    {(property.cadastralReference || property.registrationNumber) && (
                      <>
                        <SubDivider label="Identificación registral" />
                        <div className="space-y-3 mt-2">
                          <InfoRow
                            label="Matrícula inmobiliaria"
                            value={property.registrationNumber}
                            mono
                          />
                          <InfoRow
                            label="Ficha catastral"
                            value={property.cadastralReference}
                            mono
                          />
                        </div>
                      </>
                    )}

                    {/* Escritura pública */}
                    {(property.publicDeedNumber || property.registeredOwner) && (
                      <>
                        <SubDivider label="Escritura pública" />
                        <div className="space-y-3 mt-2">
                          <InfoRow
                            label="Escritura pública N.º"
                            value={property.publicDeedNumber}
                          />
                          <InfoRow
                            label="Propietario registrado"
                            value={property.registeredOwner}
                          />
                        </div>
                      </>
                    )}

                    {/* Estado legal */}
                    {(property.legalStatus || property.cadastralAppraisal) && (
                      <>
                        <SubDivider label="Estado legal" />
                        <div className="space-y-3 mt-2">
                          {property.legalStatus && (
                            <div>
                              <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Estado jurídico</p>
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                  property.legalStatus === "saneado"
                                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                                    : property.legalStatus === "hipotecado"
                                    ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                                    : "bg-red-500/15 text-red-400 border-red-500/30"
                                }`}
                              >
                                {String(property.legalStatus).replace(/_/g, " ")}
                              </span>
                            </div>
                          )}
                          {property.cadastralAppraisal && (
                            <div>
                              <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Avalúo catastral</p>
                              <p className="text-[var(--color-text)] text-sm font-semibold">
                                {formatPrice(property.cadastralAppraisal)}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Propiedad horizontal */}
                    {property.horizontalProperty && (
                      <>
                        <SubDivider label="Propiedad horizontal" />
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <FaBuilding className="text-primary text-xs" />
                            <span className="text-[var(--color-text)] text-sm font-semibold">
                              Régimen de Propiedad Horizontal
                            </span>
                          </div>
                          {property.horizontalPropertyRegime && (
                            <p className="text-[var(--color-text-muted)] text-xs leading-relaxed pl-4">
                              {property.horizontalPropertyRegime}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Gravámenes */}
                    {property.liensAndLimitations && (
                      <>
                        <SubDivider label="Gravámenes y limitaciones" />
                        <div className="mt-2 flex items-start gap-2">
                          <FaExclamationTriangle
                            className={`text-xs mt-0.5 flex-shrink-0 ${
                              property.liensAndLimitations
                                .toLowerCase()
                                .includes("sin gravamen")
                                ? "text-green-400"
                                : "text-yellow-400"
                            }`}
                          />
                          <p className="text-[var(--color-text)] text-xs leading-relaxed">
                            {property.liensAndLimitations}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── COSTOS ADICIONALES ───────────────── */}
                {hasCosts && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaDollarSign className="text-primary" />
                      <h4 className="text-light font-bold">Costos adicionales</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      {property.propertyTax && (
                        <div className="flex justify-between gap-3">
                          <span className="text-[var(--color-text-muted)]">Predial (anual)</span>
                          <span className="text-light font-semibold">
                            {formatPrice(property.propertyTax)}
                          </span>
                        </div>
                      )}
                      {property.administrationFee && (
                        <div className="flex justify-between gap-3">
                          <span className="text-[var(--color-text-muted)]">Administración</span>
                          <span className="text-light font-semibold">
                            {formatPrice(property.administrationFee)}/mes
                          </span>
                        </div>
                      )}
                      {property.rentalDeposit && (
                        <div className="flex justify-between gap-3">
                          <span className="text-[var(--color-text-muted)]">Depósito</span>
                          <span className="text-light font-semibold">
                            {property.rentalDeposit} mes(es)
                          </span>
                        </div>
                      )}
                      {property.minimumRentalPeriod && (
                        <div className="flex justify-between gap-3">
                          <span className="text-[var(--color-text-muted)]">Período mínimo</span>
                          <span className="text-light font-semibold">
                            {property.minimumRentalPeriod} meses
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Publicada el */}
                {property.createdAt && (
                  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
                    <p className="text-[var(--color-text-muted)] text-xs mb-1">Publicada el</p>
                    <p className="text-light text-sm">{formatDate(property.createdAt)}</p>
                    {property.updatedAt && (
                      <>
                        <p className="text-[var(--color-text-muted)] text-xs mb-1 mt-2">Última actualización</p>
                        <p className="text-[var(--color-text-muted)] text-sm">{formatDate(property.updatedAt)}</p>
                      </>
                    )}
                  </div>
                )}

                {/* ── NOTAS INTERNAS ───────────────────── */}
                {hasNotes && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FaStickyNote className="text-orange-400" />
                      <h4 className="text-orange-300 font-bold text-sm">
                        Notas Internas
                      </h4>
                      <span className="ml-auto text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-400 rounded-full font-semibold border border-orange-500/25">
                        PRIVADO
                      </span>
                    </div>
                    <p className="text-[var(--color-text-muted)] text-xs mb-3 leading-relaxed">
                      Esta información es solo visible para el equipo.
                      No se muestra en la página pública.
                    </p>

                    {property.propertyObservations && (
                      <div className="mb-3">
                        <p className="text-orange-400/70 text-xs font-semibold mb-1 uppercase tracking-wide">
                          Observaciones del inmueble
                        </p>
                        <p className="text-[var(--color-text)] text-xs leading-relaxed whitespace-pre-line bg-[var(--color-surface)]/60 p-3 rounded-lg border border-[var(--color-border)]">
                          {property.propertyObservations}
                        </p>
                      </div>
                    )}

                    {property.ownerRecommendations && (
                      <div>
                        <p className="text-orange-400/70 text-xs font-semibold mb-1 uppercase tracking-wide">
                          Recomendaciones del propietario
                        </p>
                        <p className="text-[var(--color-text)] text-xs leading-relaxed whitespace-pre-line bg-[var(--color-surface)]/60 p-3 rounded-lg border border-[var(--color-border)]">
                          {property.ownerRecommendations}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Botones de acción ────────────────── */}
                <div className="space-y-2">
<button
  onClick={() => setShowClientPrint(true)}
  className="w-full px-4 py-3 bg-primary hover:bg-yellow-500 text-slate-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
>
  <FaFilePdf /> Ficha para Cliente
</button>

<button
  onClick={() => setShowAdminPrint(true)}
  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-[var(--color-text)] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
>
  <FaFilePdf /> Ficha Completa (Admin)
</button>

                  {onEdit && (
                    <button
                      onClick={() => onEdit?.(property)}
                      className="w-full px-4 py-3 bg-primary hover:bg-yellow-500 text-slate-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <FaEdit />
                      Editar Propiedad
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={() => setConfirmModal(true)}
                      disabled={isDeleting}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-[var(--color-text)] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FaTrash />
                      {isDeleting ? "Eliminando..." : "Eliminar Propiedad"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ══ Modal de imagen ampliada ════════════ */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowImageModal(false)}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 w-12 h-12 bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Cerrar imagen"
            >
              <FaTimes className="text-[var(--color-text)] text-xl" />
            </button>

            <img
              src={images[currentImageIndex]}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Anterior"
                >
                  <FaChevronLeft className="text-[var(--color-text)] text-xl" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Siguiente"
                >
                  <FaChevronRight className="text-[var(--color-text)] text-xl" />
                </button>
              </>
            )}
          
          </motion.div>
        )}
      </AnimatePresence>

      {showClientPrint && (
      <PropertyClientPrint property={property} onClose={() => setShowClientPrint(false)} />
      )}
      {showAdminPrint && (
      <PropertyPrintView property={property} onClose={() => setShowAdminPrint(false)} />
    )}

      {/* ══ ConfirmModal eliminación ════════════ */}
      <ConfirmModal
        isOpen={confirmModal}
        title="Eliminar propiedad"
        message={`¿Seguro que quieres eliminar "${property.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal(false)}
        confirmText="Sí, eliminar"
      />
    </>
  );
};

export default PropertyDetail;