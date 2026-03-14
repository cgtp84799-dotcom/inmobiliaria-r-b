import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import {
  FaTimes,
  FaHome,
  FaMapMarkerAlt,
  FaDollarSign,
  FaImage,
  FaFilePdf,
  FaTrash,
  FaPlus,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaUpload,
  FaSpinner,
  FaTag,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { uploadPropertyImages, uploadPropertyDocuments } from "../services/storage.service";
import LocationPicker from "./LocationPicker";

// ============================================================
// DATOS ESTÁTICOS
// ============================================================

const PROPERTY_TYPES = [
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "lote", label: "Lote" },
  { value: "local", label: "Local Comercial" },
  { value: "bodega", label: "Bodega" },
  { value: "finca", label: "Finca" },
  { value: "oficina", label: "Oficina" },
  { value: "otro", label: "Otro" },
];

const TRANSACTION_TYPES = [
  { value: "venta", label: "Venta" },
  { value: "arriendo", label: "Arriendo" },
  { value: "venta_arriendo", label: "Venta y Arriendo" },
];

const PROPERTY_STATUS = [
  { value: "disponible", label: "Disponible" },
  { value: "reservada", label: "Reservada" },
  { value: "arrendada", label: "Arrendada" },
  { value: "vendida", label: "Vendida" },
];

const LEGAL_STATUS = [
  { value: "libre", label: "Libre de gravámenes" },
  { value: "hipoteca", label: "Hipotecado" },
  { value: "embargo", label: "Embargado" },
  { value: "sucesion", label: "En sucesión" },
];

const AMENITIES_LIST = [
  "Piscina",
  "Garaje",
  "Jardín",
  "Terraza",
  "Gimnasio",
  "Seguridad 24/7",
  "Ascensor",
  "Portería",
  "Zona BBQ",
  "Salón comunal",
  "Parque infantil",
  "Cancha deportiva",
  "Cuarto de servicio",
  "Depósito",
  "Lavandería",
  "Estudio",
  "Vista panorámica",
  "Balcón",
  "Closets",
  "Gas natural",
  "Aire acondicionado",
  "Calefacción",
  "Internet fibra",
  "Parqueadero visitantes",
];

// ============================================================
// HELPERS
// ============================================================

const formatCOP = (value) => {
  if (!value && value !== 0) return "";
  const num = typeof value === "string" ? value.replace(/\D/g, "") : String(value);
  if (!num) return "";
  return new Intl.NumberFormat("es-CO").format(parseInt(num, 10));
};

const parseCOP = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const PropertyForm = ({ property, onSubmit, onClose, isLoading }) => {
  const isEditing = !!property;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: isEditing
      ? {
          ...property,
          price: property.price ? formatCOP(property.price) : "",
          propertyTax: property.propertyTax ? formatCOP(property.propertyTax) : "",
          administrationFee: property.administrationFee ? formatCOP(property.administrationFee) : "",
        }
      : {
          type: "casa",
          transactionType: "venta",
          status: "disponible",
          department: "Caldas",
          amenities: [],
        },
  });

  // ── Estado local ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("info");
  const [images, setImages] = useState(property?.images || []);
  const [documents, setDocuments] = useState(property?.documents || []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [customAmenity, setCustomAmenity] = useState("");
  const [customAmenities, setCustomAmenities] = useState(property?.customAmenities || []);

  // Coordenadas del mapa
  const [mapCoords, setMapCoords] = useState({
    latitude: property?.latitude || "",
    longitude: property?.longitude || "",
  });

  // ── Bloquear scroll del fondo ──────────────────────────────
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

  // ── Cerrar con ESC ─────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // ── Tabs ───────────────────────────────────────────────────
  const tabs = [
    { id: "info",     label: "Información" },
    { id: "location", label: "Ubicación" },
    { id: "details",  label: "Detalles" },
    { id: "amenities",label: "Amenidades" },
    { id: "media",    label: "Media" },
    { id: "legal",    label: "Legal" },
  ];

  // ── Submit ─────────────────────────────────────────────────
  const handleFormSubmit = (data) => {
    const processedData = {
      ...data,
      price: parseCOP(data.price),
      propertyTax: parseCOP(data.propertyTax),
      administrationFee: parseCOP(data.administrationFee),
      images,
      documents,
      customAmenities,
      latitude:  mapCoords.latitude,
      longitude: mapCoords.longitude,
    };
    onSubmit(processedData);
  };

  // ── Imágenes ───────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const urls = await uploadPropertyImages(files);
      setImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} imagen(es) subida(s)`);
    } catch {
      toast.error("Error al subir imágenes");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (currentImageIndex >= index && currentImageIndex > 0) {
      setCurrentImageIndex((p) => p - 1);
    }
  };

  // ── Documentos ─────────────────────────────────────────────
  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingDocs(true);
    try {
      const docs = await uploadPropertyDocuments(files);
      setDocuments((prev) => [...prev, ...docs]);
      toast.success(`${docs.length} documento(s) subido(s)`);
    } catch {
      toast.error("Error al subir documentos");
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Amenidades personalizadas ──────────────────────────────
  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    setCustomAmenities((prev) => [...prev, trimmed]);
    setCustomAmenity("");
  };

  const removeCustomAmenity = (index) => {
    setCustomAmenities((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Valores del form para el LocationPicker ────────────────
  const watchedAddress    = watch("address");
  const watchedCity       = watch("city");
  const watchedDepartment = watch("department");

  // ── Campos de precio con formato ──────────────────────────
  const PriceInput = ({ name, label, required }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <Controller
          name={name}
          control={control}
          rules={required ? { required: `${label} es requerido` } : {}}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              inputMode="numeric"
              placeholder="0"
              className={`w-full bg-slate-900 border rounded-xl pl-7 pr-4 py-2.5 text-light text-sm outline-none transition-colors ${
                errors[name] ? "border-red-500" : "border-slate-700 focus:border-primary"
              }`}
              onChange={(e) => field.onChange(formatCOP(e.target.value))}
            />
          )}
        />
      </div>
      {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name].message}</p>}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl my-4 sm:my-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 rounded-t-2xl">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-primary">
                {isEditing ? "Editar Propiedad" : "Nueva Propiedad"}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {isEditing ? `Editando: ${property.title}` : "Completa los datos de la propiedad"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
            >
              <FaTimes className="text-light" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-800 px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="p-4 sm:p-6 space-y-5">

              {/* ─── TAB: INFORMACIÓN ──────────────────────── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-light flex items-center gap-2">
                    <FaHome className="text-primary" /> Información General
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Título *</label>
                    <input
                      {...register("title", { required: "El título es requerido" })}
                      placeholder="Ej: Casa campestre con piscina"
                      className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors ${
                        errors.title ? "border-red-500" : "border-slate-700 focus:border-primary"
                      }`}
                    />
                    {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción</label>
                    <textarea
                      {...register("description")}
                      rows={4}
                      placeholder="Describe las características más relevantes de la propiedad..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de propiedad *</label>
                      <select
                        {...register("type", { required: "Requerido" })}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      >
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de transacción *</label>
                      <select
                        {...register("transactionType", { required: "Requerido" })}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      >
                        {TRANSACTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Estado *</label>
                    <select
                      {...register("status", { required: "Requerido" })}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                    >
                      {PROPERTY_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ─── TAB: UBICACIÓN ────────────────────────── */}
              {activeTab === "location" && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-light flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary" /> Ubicación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Dirección *</label>
                      <input
                        {...register("address", { required: "La dirección es requerida" })}
                        placeholder="Ej: Calle 5 #10-20"
                        className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors ${
                          errors.address ? "border-red-500" : "border-slate-700 focus:border-primary"
                        }`}
                      />
                      {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Barrio</label>
                      <input
                        {...register("neighborhood")}
                        placeholder="Ej: Centro"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Ciudad *</label>
                      <input
                        {...register("city", { required: "La ciudad es requerida" })}
                        placeholder="Ej: Anserma"
                        className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors ${
                          errors.city ? "border-red-500" : "border-slate-700 focus:border-primary"
                        }`}
                      />
                      {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Departamento</label>
                      <input
                        {...register("department")}
                        placeholder="Ej: Caldas"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Mapa interactivo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Ubicación en el mapa</label>
                    <LocationPicker
                      latitude={mapCoords.latitude}
                      longitude={mapCoords.longitude}
                      address={watchedAddress}
                      city={watchedCity}
                      department={watchedDepartment}
                      onChange={(coords) => setMapCoords(coords)}
                    />
                  </div>

                  {/* Coordenadas manuales */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Latitud</label>
                      <input
                        type="number"
                        step="any"
                        value={mapCoords.latitude}
                        onChange={(e) => setMapCoords((p) => ({ ...p, latitude: e.target.value }))}
                        placeholder="5.2383"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Longitud</label>
                      <input
                        type="number"
                        step="any"
                        value={mapCoords.longitude}
                        onChange={(e) => setMapCoords((p) => ({ ...p, longitude: e.target.value }))}
                        placeholder="-75.785"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: DETALLES ─────────────────────────── */}
              {activeTab === "details" && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-light flex items-center gap-2">
                    <FaDollarSign className="text-primary" /> Precio y Detalles
                  </h3>

                  <PriceInput name="price" label="Precio *" required />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Área total (m²)</label>
                      <input
                        {...register("area")}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Área construida (m²)</label>
                      <input
                        {...register("builtArea")}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Habitaciones</label>
                      <input
                        {...register("rooms")}
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Baños</label>
                      <input
                        {...register("bathrooms")}
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Parqueaderos</label>
                      <input
                        {...register("parkingSpots")}
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Pisos</label>
                      <input
                        {...register("floors")}
                        type="number"
                        min="1"
                        placeholder="1"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Año de construcción</label>
                      <input
                        {...register("yearBuilt")}
                        type="number"
                        min="1900"
                        max="2099"
                        placeholder="2020"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Estrato</label>
                      <input
                        {...register("stratum")}
                        type="number"
                        min="1"
                        max="6"
                        placeholder="1-6"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Comisión (%)</label>
                      <input
                        {...register("commissionPercentage")}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="3"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PriceInput name="propertyTax" label="Predial anual" />
                    <PriceInput name="administrationFee" label="Cuota de administración" />
                  </div>

                  {/* Propietario */}
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Datos del propietario</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre</label>
                        <input
                          {...register("ownerName")}
                          placeholder="Nombre completo"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Teléfono</label>
                        <input
                          {...register("ownerPhone")}
                          type="tel"
                          placeholder="Ej: 300 123 4567"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
                        <input
                          {...register("ownerEmail")}
                          type="email"
                          placeholder="correo@ejemplo.com"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: AMENIDADES ───────────────────────── */}
              {activeTab === "amenities" && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-light flex items-center gap-2">
                    <FaCheck className="text-primary" /> Amenidades
                  </h3>

                  <Controller
                    name="amenities"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AMENITIES_LIST.map((amenity) => {
                          const isSelected = (field.value || []).includes(amenity);
                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => {
                                const current = field.value || [];
                                field.onChange(
                                  isSelected
                                    ? current.filter((a) => a !== amenity)
                                    : [...current, amenity]
                                );
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                                isSelected
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? "bg-primary" : "bg-slate-700"
                                }`}
                              >
                                {isSelected && <FaCheck className="text-slate-950 text-xs" />}
                              </div>
                              {amenity}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />

                  {/* Amenidades personalizadas */}
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <FaTag className="text-primary" /> Amenidades personalizadas
                    </h4>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomAmenity())}
                        placeholder="Escribe una amenidad..."
                        className="flex-1 bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addCustomAmenity}
                        className="px-4 py-2.5 bg-primary hover:bg-yellow-500 text-slate-950 rounded-xl font-semibold transition-colors text-sm"
                      >
                        <FaPlus />
                      </button>
                    </div>

                    {customAmenities.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {customAmenities.map((amenity, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm"
                          >
                            {amenity}
                            <button
                              type="button"
                              onClick={() => removeCustomAmenity(i)}
                              className="text-primary/60 hover:text-red-400 transition-colors"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB: MEDIA ────────────────────────────── */}
              {activeTab === "media" && (
                <div className="space-y-6">
                  {/* Imágenes */}
                  <div>
                    <h3 className="text-base font-semibold text-light flex items-center gap-2 mb-4">
                      <FaImage className="text-primary" /> Imágenes
                    </h3>

                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-primary transition-colors bg-slate-900/50">
                      <div className="text-center">
                        {uploadingImages ? (
                          <FaSpinner className="text-2xl text-primary mx-auto animate-spin mb-2" />
                        ) : (
                          <FaUpload className="text-2xl text-slate-500 mx-auto mb-2" />
                        )}
                        <span className="text-slate-400 text-sm">
                          {uploadingImages ? "Subiendo..." : "Clic para subir imágenes"}
                        </span>
                        <span className="text-slate-600 text-xs block mt-1">JPG, PNG, WebP — múltiples archivos</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                      />
                    </label>

                    {images.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {/* Vista previa principal */}
                        <div className="relative rounded-xl overflow-hidden bg-slate-900">
                          <div className="aspect-video">
                            <img
                              src={images[currentImageIndex]}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {images.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center"
                              >
                                <FaChevronLeft className="text-white" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCurrentImageIndex((p) => (p + 1) % images.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center"
                              >
                                <FaChevronRight className="text-white" />
                              </button>
                            </>
                          )}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                            {currentImageIndex + 1} / {images.length}
                          </div>
                        </div>

                        {/* Miniaturas */}
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                          {images.map((img, i) => (
                            <div key={i} className="relative group">
                              <img
                                src={img}
                                alt={`img-${i}`}
                                className={`w-full h-14 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                                  currentImageIndex === i ? "border-primary" : "border-transparent"
                                }`}
                                onClick={() => setCurrentImageIndex(i)}
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <FaTimes className="text-white text-xs" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Documentos */}
                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-base font-semibold text-light flex items-center gap-2 mb-4">
                      <FaFilePdf className="text-primary" /> Documentos Legales
                    </h3>

                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-primary transition-colors bg-slate-900/50">
                      <div className="text-center">
                        {uploadingDocs ? (
                          <FaSpinner className="text-2xl text-primary mx-auto animate-spin mb-2" />
                        ) : (
                          <FaUpload className="text-2xl text-slate-500 mx-auto mb-2" />
                        )}
                        <span className="text-slate-400 text-sm">
                          {uploadingDocs ? "Subiendo..." : "Clic para subir documentos"}
                        </span>
                        <span className="text-slate-600 text-xs block mt-1">PDF</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDocs}
                      />
                    </label>

                    {documents.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {documents.map((doc, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <FaFilePdf className="text-red-400 flex-shrink-0" />
                              <span className="text-slate-300 text-sm truncate">{doc.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument(i)}
                              className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB: LEGAL ────────────────────────────── */}
              {activeTab === "legal" && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-light">Información Legal</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Ficha catastral</label>
                      <input
                        {...register("cadastralReference")}
                        placeholder="Número de ficha catastral"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Matrícula inmobiliaria</label>
                      <input
                        {...register("registrationNumber")}
                        placeholder="Número de matrícula"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Estado jurídico</label>
                    <select
                      {...register("legalStatus")}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors"
                    >
                      <option value="">Seleccionar...</option>
                      {LEGAL_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Notas legales</label>
                    <textarea
                      {...register("legalNotes")}
                      rows={3}
                      placeholder="Observaciones sobre el estado legal de la propiedad..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-primary rounded-xl px-4 py-2.5 text-light text-sm outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 sm:px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-light rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-primary hover:bg-yellow-500 text-slate-950 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <><FaSpinner className="animate-spin" /> Guardando...</>
                ) : (
                  <><FaCheck /> {isEditing ? "Guardar cambios" : "Crear propiedad"}</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </>
  );
};

export default PropertyForm;
