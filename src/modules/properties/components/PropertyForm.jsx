import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronDown,
  FaChevronUp,
  FaHome,
  FaMapMarkerAlt,
  FaCog,
  FaBalanceScale,
  FaFileAlt,
  FaImages,
  FaTrash,
  FaPlus,
  FaSave,
  FaTimes,
  FaMapMarkedAlt,
  FaPercentage,
  FaCalculator,
  FaListAlt,
  FaStickyNote,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../../core/config/firebase.config";
import LocationPicker from "./LocationPicker";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatPrice = (price) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price || 0);

const compressImage = (file, maxWidth = 1920, quality = 0.8) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            ),
          "image/jpeg",
          quality
        );
      };
    };
  });

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────

/** Separador de sub-sección dentro de una Section */
const SubSectionDivider = ({ label }) => (
  <div className="flex items-center gap-3 mt-2 mb-1">
    <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-[var(--color-input-bg)]" />
  </div>
);

const Section = ({
  id,
  title,
  icon: Icon,
  children,
  color = "primary",
  isOpen,
  onToggle,
}) => (
  <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl overflow-hidden mb-4">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--color-surface)]/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 bg-${color}/10 rounded-lg flex items-center justify-center`}
        >
          <Icon className={`text-${color} text-lg`} />
        </div>
        <h3 className="text-lg font-bold text-light">{title}</h3>
      </div>
      {isOpen ? (
        <FaChevronUp className="text-[var(--color-text-muted)]" />
      ) : (
        <FaChevronDown className="text-[var(--color-text-muted)]" />
      )}
    </button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-6 py-4 border-t border-[var(--color-border)]">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const SortableImage = ({ id, src, index, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative group rounded-lg overflow-hidden cursor-move border border-[var(--color-border)]"
      {...attributes}
      {...listeners}
    >
      <img src={src} alt={`Imagen ${index + 1}`} className="w-full h-24 object-cover" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 w-7 h-7 bg-red-600 hover:bg-red-500 text-[var(--color-text)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <FaTrash className="text-xs" />
      </button>
      {index === 0 && (
        <span className="absolute bottom-1 left-1 bg-primary text-slate-950 text-xs font-bold px-1.5 py-0.5 rounded">
          Principal
        </span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Input / Textarea helpers para no repetir clases
// ─────────────────────────────────────────────
const inputCls =
  "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

const textareaCls =
  "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none";

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const PropertyForm = ({ property = null, onClose, onSave }) => {
  // Bloquear scroll del fondo
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // ── Estado del formulario ──────────────────
  const [formData, setFormData] = useState({
    // Básico
    title: property?.title || "",
    type: property?.type || "casa",
    transactionType: property?.transactionType || "venta",
    price: property?.price || "",
    description: property?.description || "",
    status: property?.status || "published",

    // Comisiones
    commissionPercentage: property?.commissionPercentage || "",

    // Propietario
    ownerName: property?.ownerName || "",
    ownerPhone: property?.ownerPhone || "",
    ownerEmail: property?.ownerEmail || "",

    // Ubicación
    department: property?.department || "Caldas",
    city: property?.city || "Anserma",
    neighborhood: property?.neighborhood || "",
    address: property?.address || "",
    latitude: property?.latitude || null,
    longitude: property?.longitude || null,

    // Características
    area: property?.area || "",
    builtArea: property?.builtArea || "",
    rooms: property?.rooms || "",
    bathrooms: property?.bathrooms || "",
    parkingSpots: property?.parkingSpots || "",
    floors: property?.floors || "",
    yearBuilt: property?.yearBuilt || "",
    stratum: property?.stratum || "",

    // Amenidades
    amenities: property?.amenities || [],
    customAmenities: property?.customAmenities || [],

    // ── Jurídico ──────────────────────────────
    // Identificación registral
    registrationNumber: property?.registrationNumber || "",   // Matrícula inmobiliaria
    cadastralReference: property?.cadastralReference || "",   // Ficha catastral

    // Escritura pública
    publicDeedNumber: property?.publicDeedNumber || "",       // Escritura pública N.º  ✅ NUEVO
    registeredOwner: property?.registeredOwner || "",         // Propietario registrado ✅ NUEVO

    // Valores
    propertyTax: property?.propertyTax || "",                 // Predial anual
    cadastralAppraisal: property?.cadastralAppraisal || "",   // Avalúo catastral       ✅ NUEVO
    administrationFee: property?.administrationFee || "",     // Administración mensual

    // Estado legal
    legalStatus: property?.legalStatus || "saneado",
    liensAndLimitations: property?.liensAndLimitations || "", // Gravámenes             ✅ NUEVO

    // Propiedad horizontal
    horizontalProperty: property?.horizontalProperty || false,
    horizontalPropertyRegime: property?.horizontalPropertyRegime || "", // Régimen PH  ✅ NUEVO

    // Arriendo
    rentalDeposit: property?.rentalDeposit || "",
    minimumRentalPeriod: property?.minimumRentalPeriod || "",

    // Multimedia
    images: property?.images || [],
    documents: property?.documents || [],

    // ── Notas internas ────────────────────────
    propertyObservations: property?.propertyObservations || "",   // ✅ NUEVO
    ownerRecommendations: property?.ownerRecommendations || "",   // ✅ NUEVO
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");
  const [openSection, setOpenSection] = useState("basic");
  const [calculatedCommission, setCalculatedCommission] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor));

  // Cerrar con ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // ── Handlers ──────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCalculateCommission = () => {
    const price = parseFloat(formData.price) || 0;
    const percentage = parseFloat(formData.commissionPercentage) || 0;
    if (price === 0 || percentage === 0) {
      toast.error("Ingresa el precio y el porcentaje de comisión");
      return;
    }
    setCalculatedCommission((price * percentage) / 100);
    toast.success("Comisión calculada");
  };

  const handleAmenityToggle = (amenity) =>
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));

  const handleAddCustomAmenity = () => {
    if (!newAmenity.trim()) return;
    setFormData((prev) => ({
      ...prev,
      customAmenities: [...prev.customAmenities, newAmenity.trim()],
    }));
    setNewAmenity("");
    toast.success("Amenidad agregada");
  };

  const handleRemoveCustomAmenity = (amenity) =>
    setFormData((prev) => ({
      ...prev,
      customAmenities: prev.customAmenities.filter((a) => a !== amenity),
    }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImages(true);
    const toastId = toast.loading(`Optimizando y subiendo ${files.length} imágenes...`);
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file, 1920, 0.8);
          const timestamp = Date.now();
          const rand = Math.random().toString(36).substring(7);
          const storageRef = ref(storage, `properties/${timestamp}-${rand}.jpg`);
          await uploadBytes(storageRef, compressed);
          return getDownloadURL(storageRef);
        })
      );
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast.success(`${files.length} imágenes listas y optimizadas`, { id: toastId });
    } catch (error) {
      console.error("Error subiendo imágenes:", error);
      toast.error("Error subiendo imágenes", { id: toastId });
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async (index) => {
    const imageUrl = formData.images[index];
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    try {
      const decoded = decodeURIComponent(imageUrl);
      const start = decoded.indexOf("/o/") + 3;
      const end = decoded.indexOf("?alt=media");
      if (start > 2 && end > -1) {
        await deleteObject(ref(storage, decoded.substring(start, end)));
      }
    } catch (err) {
      console.error("No se pudo eliminar la imagen del storage:", err);
    }
  };

  const handleImagesDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setFormData((prev) => {
      const oldIdx = prev.images.indexOf(active.id);
      const newIdx = prev.images.indexOf(over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return { ...prev, images: arrayMove(prev.images, oldIdx, newIdx) };
    });
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingDocs(true);
    try {
      const docs = await Promise.all(
        files.map(async (file) => {
          const timestamp = Date.now();
          const rand = Math.random().toString(36).substring(7);
          const storageRef = ref(storage, `documents/${timestamp}-${rand}-${file.name}`);
          await uploadBytes(storageRef, file);
          return { name: file.name, url: await getDownloadURL(storageRef) };
        })
      );
      setFormData((prev) => ({ ...prev, documents: [...prev.documents, ...docs] }));
      toast.success(`${files.length} documentos subidos`);
    } catch (error) {
      console.error("Error subiendo documentos:", error);
      toast.error("Error subiendo documentos");
    } finally {
      setUploadingDocs(false);
      e.target.value = "";
    }
  };

  const handleRemoveDocument = async (index) => {
    const doc = formData.documents[index];
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
    try {
      const decoded = decodeURIComponent(doc.url);
      const start = decoded.indexOf("/o/") + 3;
      const end = decoded.indexOf("?alt=media");
      if (start > 2 && end > -1) {
        await deleteObject(ref(storage, decoded.substring(start, end)));
      }
    } catch (err) {
      console.error("No se pudo eliminar el documento del storage:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setLoading(false);
    }
  };

  const availableAmenities = [
    "Piscina", "Gimnasio", "Salón social", "Zonas verdes",
    "Parqueadero visitantes", "Portería 24/7", "Ascensor", "Balcón",
    "Terraza", "Patio", "Cocina integral", "Closets",
    "Aire acondicionado", "Calentador", "Gas natural", "Vigilancia",
    "CCTV", "Citófono", "Internet", "TV Cable",
  ];

  const toggle = (id) =>
    setOpenSection((prev) => (prev === id ? null : id));

  // ── JSX ───────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overscroll-contain"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="sticky top-0 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-primary">
            {property ? "Editar Propiedad" : "Nueva Propiedad"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] rounded-lg flex items-center justify-center transition-colors"
          >
            <FaTimes className="text-light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* ══════════════════════════════════════
              1. INFORMACIÓN BÁSICA
          ══════════════════════════════════════ */}
          <Section
            id="basic"
            title="Información Básica"
            icon={FaHome}
            isOpen={openSection === "basic"}
            onToggle={() => toggle("basic")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-light mb-2 font-semibold">
                  Título de la propiedad
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Casa campestre en Anserma con piscina"
                  className={inputCls}
                />
              </div>

              {/* Tipo de propiedad */}
              <div>
                <label className="block text-light mb-2 font-semibold">
                  Tipo de propiedad
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="lote">Lote</option>
                  <option value="local">Local comercial</option>
                  <option value="finca">Finca</option>
                  <option value="oficina">Oficina</option>
                  <option value="bodega">Bodega</option>
                </select>
              </div>

              {/* Tipo de negocio */}
              <div>
                <label className="block text-light mb-2 font-semibold">
                  Tipo de negocio
                </label>
                <select
                  name="transactionType"
                  value={formData.transactionType}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="venta">Venta</option>
                  <option value="arriendo">Arriendo</option>
                </select>
              </div>

              {/* Precio */}
              <div>
                <label className="block text-light mb-2 font-semibold">
                  {formData.transactionType === "venta"
                    ? "Precio de venta"
                    : "Canon de arriendo"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-[var(--color-text-muted)]">$</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    placeholder="0"
                    className={`${inputCls} pl-8`}
                  />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-light mb-2 font-semibold">
                  Estado actual
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="published">Disponible</option>
                  <option value="reserved">Reservada</option>
                  <option value="rented">Arrendada</option>
                  <option value="sold">Vendida</option>
                  <option value="inactive">Inactiva</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>

              {/* Comisiones */}
              <div className="md:col-span-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-4">
                  <FaPercentage className="text-primary text-lg" />
                  <h4 className="text-light font-bold text-lg">
                    Comisiones y honorarios
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Comisión (%)
                    </label>
                    <input
                      type="number"
                      name="commissionPercentage"
                      value={formData.commissionPercentage}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder={formData.transactionType === "venta" ? "3" : "100"}
                      className={inputCls}
                    />
                    <p className="text-[var(--color-text-muted)] text-xs mt-1">
                      {formData.transactionType === "venta"
                        ? "Estándar: 3% urbano · 5%–8% rural"
                        : "Estándar: 100% (1 mes completo)"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      &nbsp;
                    </label>
                    <button
                      type="button"
                      onClick={handleCalculateCommission}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-[var(--color-text)] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FaCalculator /> Calcular comisión
                    </button>
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Comisión total
                    </label>
                    <div className="w-full bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-lg px-4 py-3">
                      <div className="text-primary font-bold text-lg">
                        {formatPrice(calculatedCommission)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos del propietario */}
              <div className="md:col-span-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                <h4 className="text-light font-semibold mb-3">
                  Datos de contacto del propietario
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      placeholder="Nombre del propietario"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      placeholder="310 123 4567"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Email
                    </label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      placeholder="email@ejemplo.com"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-light mb-2 font-semibold">
                  Descripción pública
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Describe las características y ventajas de la propiedad..."
                  className={textareaCls}
                />
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              2. UBICACIÓN
          ══════════════════════════════════════ */}
          <Section
            id="location"
            title="Ubicación"
            icon={FaMapMarkerAlt}
            color="blue-500"
            isOpen={openSection === "location"}
            onToggle={() => toggle("location")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-light mb-2 font-semibold">
                  Departamento
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Ciudad / Municipio
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Barrio / Sector / Vereda
                </label>
                <input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  placeholder="Ej: Barrio Centro, Vereda El Porvenir"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Dirección completa
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Cra 5 # 9-28"
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2">
                <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FaMapMarkedAlt className="text-primary" />
                    <span className="text-light font-semibold">
                      Ubicación en el mapa
                    </span>
                  </div>
                  <LocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    address={formData.address}
                    neighborhood={formData.neighborhood}
                    city={formData.city}
                    department={formData.department}
                    onChange={({ latitude, longitude }) =>
                      setFormData((prev) => ({ ...prev, latitude, longitude }))
                    }
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              3. CARACTERÍSTICAS
          ══════════════════════════════════════ */}
          <Section
            id="features"
            title="Características Principales"
            icon={FaCog}
            color="green-500"
            isOpen={openSection === "features"}
            onToggle={() => toggle("features")}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-light mb-2 font-semibold">
                  Área total (m²)
                </label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {formData.type !== "lote" && (
                <div>
                  <label className="block text-light mb-2 font-semibold">
                    Área construida (m²)
                  </label>
                  <input
                    type="number"
                    name="builtArea"
                    value={formData.builtArea}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Estrato
                </label>
                <select
                  name="stratum"
                  value={formData.stratum}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Seleccionar...</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                  <option value="rural">Rural (sin estrato)</option>
                </select>
              </div>

              {["casa", "apartamento", "finca", "oficina", "local"].includes(
                formData.type
              ) && (
                <>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Habitaciones
                    </label>
                    <input
                      type="number"
                      name="rooms"
                      value={formData.rooms}
                      onChange={handleChange}
                      min="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Baños
                    </label>
                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleChange}
                      min="0"
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Parqueaderos
                </label>
                <input
                  type="number"
                  name="parkingSpots"
                  value={formData.parkingSpots}
                  onChange={handleChange}
                  min="0"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Pisos / Niveles
                </label>
                <input
                  type="number"
                  name="floors"
                  value={formData.floors}
                  onChange={handleChange}
                  min="1"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">
                  Año de construcción
                </label>
                <input
                  type="number"
                  name="yearBuilt"
                  value={formData.yearBuilt}
                  onChange={handleChange}
                  placeholder="2010"
                  className={inputCls}
                />
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              4. AMENIDADES
          ══════════════════════════════════════ */}
          <Section
            id="amenities"
            title="Amenidades y Comodidades"
            icon={FaListAlt}
            color="purple-500"
            isOpen={openSection === "amenities"}
            onToggle={() => toggle("amenities")}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {availableAmenities.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => handleAmenityToggle(amenity)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.amenities.includes(amenity)
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-[var(--color-surface)]/50 border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-slate-600"
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--color-border)]">
                <label className="block text-light mb-2 font-semibold">
                  Amenidades personalizadas
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    placeholder="Ej: Huerta orgánica, Cancha de tenis..."
                    className={`flex-1 ${inputCls} text-sm py-2.5`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-4 py-2.5 bg-primary text-slate-950 rounded-lg font-semibold hover:bg-yellow-500 transition-colors flex items-center gap-2 text-sm"
                  >
                    <FaPlus /> Agregar
                  </button>
                </div>

                {formData.customAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.customAmenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomAmenity(amenity)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              5. INFORMACIÓN JURÍDICA
          ══════════════════════════════════════ */}
          <Section
            id="legal"
            title="Información Jurídica"
            icon={FaBalanceScale}
            color="red-500"
            isOpen={openSection === "legal"}
            onToggle={() => toggle("legal")}
          >
            <div className="space-y-6">

              {/* ── Identificación Registral ── */}
              <div>
                <SubSectionDivider label="Identificación Registral" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Matrícula inmobiliaria
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      placeholder="Ej: 176-12345"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Ficha catastral
                    </label>
                    <input
                      type="text"
                      name="cadastralReference"
                      value={formData.cadastralReference}
                      onChange={handleChange}
                      placeholder="Ej: 00-00-0000-0000-000"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* ── Escritura Pública ── */}
              <div>
                <SubSectionDivider label="Escritura Pública" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Escritura pública N.º
                    </label>
                    <input
                      type="text"
                      name="publicDeedNumber"
                      value={formData.publicDeedNumber}
                      onChange={handleChange}
                      placeholder="Ej: 1245 · Notaría 2 · 2018"
                      className={inputCls}
                    />
                    <p className="text-[var(--color-text-muted)] text-xs mt-1">
                      Número, notaría y año de la escritura de compraventa.
                    </p>
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Propietario registrado
                    </label>
                    <input
                      type="text"
                      name="registeredOwner"
                      value={formData.registeredOwner}
                      onChange={handleChange}
                      placeholder="Nombre tal como aparece en escritura"
                      className={inputCls}
                    />
                    <p className="text-[var(--color-text-muted)] text-xs mt-1">
                      Puede diferir del propietario de contacto.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Valores ── */}
              <div>
                <SubSectionDivider label="Valores" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Predial anual (COP)
                    </label>
                    <input
                      type="number"
                      name="propertyTax"
                      value={formData.propertyTax}
                      onChange={handleChange}
                      min="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Avalúo catastral (COP)
                    </label>
                    <input
                      type="number"
                      name="cadastralAppraisal"
                      value={formData.cadastralAppraisal}
                      onChange={handleChange}
                      min="0"
                      placeholder="Valor IGAC"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Administración mensual (COP)
                    </label>
                    <input
                      type="number"
                      name="administrationFee"
                      value={formData.administrationFee}
                      onChange={handleChange}
                      min="0"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* ── Estado Legal ── */}
              <div>
                <SubSectionDivider label="Estado Legal" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-light mb-2 font-semibold">
                      Estado jurídico
                    </label>
                    <select
                      name="legalStatus"
                      value={formData.legalStatus}
                      onChange={handleChange}
                      className={inputCls}
                    >
                      <option value="saneado">Saneado</option>
                      <option value="en_proceso">En proceso de saneamiento</option>
                      <option value="litigio">En litigio</option>
                      <option value="hipotecado">Hipotecado</option>
                      <option value="embargado">Embargado</option>
                      <option value="sucesion">En sucesión</option>
                    </select>
                  </div>

                  {/* Propiedad horizontal */}
                  <div className="flex flex-col justify-center pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        id="horizontalProperty"
                        name="horizontalProperty"
                        checked={formData.horizontalProperty}
                        onChange={handleChange}
                        className="w-5 h-5 rounded accent-primary"
                      />
                      <span className="text-light font-semibold group-hover:text-primary transition-colors">
                        Propiedad horizontal (PH)
                      </span>
                    </label>
                    <p className="text-[var(--color-text-muted)] text-xs mt-1 ml-8">
                      Edificio, conjunto o copropiedad con reglamento.
                    </p>
                  </div>
                </div>

                {/* Régimen PH — condicional */}
                {formData.horizontalProperty && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-lg"
                  >
                    <label className="block text-light mb-2 font-semibold">
                      Régimen de propiedad horizontal
                    </label>
                    <input
                      type="text"
                      name="horizontalPropertyRegime"
                      value={formData.horizontalPropertyRegime}
                      onChange={handleChange}
                      placeholder="Ej: Reglamento Escritura N.º 450/2018 · Torre 3 · Apto 201"
                      className={inputCls}
                    />
                    <p className="text-[var(--color-text-muted)] text-xs mt-1">
                      Escribe el número del reglamento, torre, apto o cualquier dato relevante del régimen.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* ── Gravámenes o limitaciones ── */}
              <div>
                <SubSectionDivider label="Gravámenes y Limitaciones" />
                <div className="mt-3">
                  <label className="block text-light mb-2 font-semibold">
                    Gravámenes o limitaciones al dominio
                  </label>
                  <textarea
                    name="liensAndLimitations"
                    value={formData.liensAndLimitations}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Ej: Hipoteca a favor del Banco ABC · Embargo preventivo Juzgado 2 · Servidumbre de paso · Sin gravámenes"
                    className={textareaCls}
                  />
                  <p className="text-[var(--color-text-muted)] text-xs mt-1">
                    Incluye hipotecas, embargos, servidumbres, usufructos o cualquier limitación al libre dominio.
                    Escribe "Sin gravámenes" si el predio está limpio.
                  </p>
                </div>
              </div>

              {/* ── Condiciones de Arriendo (condicional) ── */}
              {formData.transactionType === "arriendo" && (
                <div>
                  <SubSectionDivider label="Condiciones de Arriendo" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-light mb-2 font-semibold">
                        Depósito (N.º de meses)
                      </label>
                      <input
                        type="number"
                        name="rentalDeposit"
                        value={formData.rentalDeposit}
                        onChange={handleChange}
                        min="0"
                        placeholder="1"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-light mb-2 font-semibold">
                        Período mínimo (meses)
                      </label>
                      <input
                        type="number"
                        name="minimumRentalPeriod"
                        value={formData.minimumRentalPeriod}
                        onChange={handleChange}
                        min="1"
                        placeholder="12"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ══════════════════════════════════════
              6. IMÁGENES Y DOCUMENTOS
          ══════════════════════════════════════ */}
          <Section
            id="media"
            title="Imágenes y Documentos"
            icon={FaImages}
            color="orange-500"
            isOpen={openSection === "media"}
            onToggle={() => toggle("media")}
          >
            <div className="space-y-6">
              {/* Imágenes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-light font-semibold">
                    Imágenes de la propiedad
                  </label>
                  <span className="text-[var(--color-text-muted)] text-sm">
                    {formData.images.length} imagen{formData.images.length !== 1 ? "es" : ""}
                  </span>
                </div>

                <label className="block w-full border-2 border-dashed border-slate-600 hover:border-primary rounded-xl p-6 cursor-pointer transition-colors text-center group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                  {uploadingImages ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-[var(--color-text-muted)]">Procesando y subiendo...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FaImages className="text-4xl text-[var(--color-text-faint)] group-hover:text-primary transition-colors" />
                      <p className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">
                        Arrastra imágenes aquí o haz clic para seleccionar
                      </p>
                      <p className="text-[var(--color-text-faint)] text-sm">
                        Se optimizarán automáticamente · Arrastra para reordenar
                      </p>
                    </div>
                  )}
                </label>

                {formData.images.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleImagesDragEnd}
                  >
                    <SortableContext items={formData.images}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                        {formData.images.map((img, index) => (
                          <SortableImage
                            key={img}
                            id={img}
                            src={img}
                            index={index}
                            onRemove={() => handleRemoveImage(index)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Documentos */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-light font-semibold">
                    Documentos legales
                  </label>
                  <span className="text-[var(--color-text-muted)] text-sm">
                    {formData.documents.length} documento{formData.documents.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <label className="block w-full border-2 border-dashed border-slate-600 hover:border-primary rounded-xl p-6 cursor-pointer transition-colors text-center group">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={uploadingDocs}
                  />
                  {uploadingDocs ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-[var(--color-text-muted)]">Subiendo documentos...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FaFileAlt className="text-4xl text-[var(--color-text-faint)] group-hover:text-primary transition-colors" />
                      <p className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">
                        Subir documentos (PDF, DOC, DOCX)
                      </p>
                    </div>
                  )}
                </label>

                {formData.documents.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {formData.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-3 bg-[var(--color-surface)]/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FaFileAlt className="text-[var(--color-text-muted)] flex-shrink-0" />
                          <span className="text-light text-sm truncate">{doc.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(index)}
                          className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              7. NOTAS INTERNAS  (solo admin)
          ══════════════════════════════════════ */}
          <Section
            id="notes"
            title="Notas Internas"
            icon={FaStickyNote}
            color="orange-500"
            isOpen={openSection === "notes"}
            onToggle={() => toggle("notes")}
          >
            <div className="space-y-5">
              {/* Aviso privacidad */}
              <div className="flex items-start gap-3 p-3 bg-[var(--color-surface)]/60 border border-[var(--color-border)] rounded-lg">
                <FaStickyNote className="text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                  Esta sección es <span className="text-orange-400 font-semibold">privada</span>.
                  La información aquí registrada es solo visible para el equipo de la inmobiliaria
                  y <strong className="text-[var(--color-text)]">nunca</strong> se muestra en la página pública.
                </p>
              </div>

              {/* Observaciones del inmueble */}
              <div>
                <label className="block text-light mb-1 font-semibold">
                  Observaciones del inmueble
                </label>
                <p className="text-[var(--color-text-muted)] text-xs mb-2">
                  Estado físico, aspectos a mejorar, detalles que el agente note en visita.
                </p>
                <textarea
                  name="propertyObservations"
                  value={formData.propertyObservations}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Ej: Techo requiere mantenimiento en zona oriente · Pintura exterior en buen estado · Cocina remodelada en 2023 · Humedad leve en baño principal..."
                  className={textareaCls}
                />
              </div>

              {/* Recomendaciones especiales del propietario */}
              <div>
                <label className="block text-light mb-1 font-semibold">
                  Recomendaciones especiales del propietario
                </label>
                <p className="text-[var(--color-text-muted)] text-xs mb-2">
                  Instrucciones del dueño para la gestión: visitas, condiciones, restricciones.
                </p>
                <textarea
                  name="ownerRecommendations"
                  value={formData.ownerRecommendations}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Ej: Solo visitas los fines de semana · No se admiten mascotas · Precio negociable en venta de contado · Avisar con 48h de anticipación..."
                  className={textareaCls}
                />
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              BOTONES DE ACCIÓN (sticky)
          ══════════════════════════════════════ */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sticky bottom-0 bg-[var(--color-bg)] pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] text-light font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary hover:bg-yellow-500 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave />
                  {property ? "Actualizar Propiedad" : "Guardar Propiedad"}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PropertyForm;