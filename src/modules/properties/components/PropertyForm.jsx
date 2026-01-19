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
} from "react-icons/fa";
import toast from "react-hot-toast";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../core/config/firebase.config";

// Formatear precio
const formatPrice = (price) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

// Función para comprimir imágenes
const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
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
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
          "image/jpeg",
          quality
        );
      };
    };
  });
};

// COMPONENTE SECTION FUERA DEL PROPERTYFORM
const Section = ({ id, title, icon: Icon, children, color = "primary", isOpen, onToggle }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-${color}/10 rounded-lg flex items-center justify-center`}>
            <Icon className={`text-${color} text-lg`} />
          </div>
          <h3 className="text-lg font-bold text-light">{title}</h3>
        </div>
        {isOpen ? <FaChevronUp className="text-slate-400" /> : <FaChevronDown className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 py-4 border-t border-slate-800">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PropertyForm = ({ property = null, onClose, onSave }) => {
  // ✅ FIX: Bloquear scroll del fondo y conservar la posición
  useEffect(() => {
    const scrollY = window.scrollY;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;

      window.scrollTo(0, scrollY);
    };
  }, []);

  // Estados del formulario
  const [formData, setFormData] = useState({
    title: property?.title || "",
    type: property?.type || "casa",
    transactionType: property?.transactionType || "venta",
    price: property?.price || "",
    description: property?.description || "",
    status: property?.status || "disponible",

    // Comisiones
    commissionPercentage: property?.commissionPercentage || "",

    // Ubicación
    department: property?.department || "Caldas",
    city: property?.city || "Anserma",
    neighborhood: property?.neighborhood || "",
    address: property?.address || "",

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

    // Jurídico
    cadastralReference: property?.cadastralReference || "",
    registrationNumber: property?.registrationNumber || "",
    propertyTax: property?.propertyTax || "",
    administrationFee: property?.administrationFee || "",
    horizontalProperty: property?.horizontalProperty || false,
    legalStatus: property?.legalStatus || "saneado",

    // Arriendo
    rentalDeposit: property?.rentalDeposit || "",
    minimumRentalPeriod: property?.minimumRentalPeriod || "",

    // Multimedia
    images: property?.images || [],
    documents: property?.documents || [],

    // Propietario
    ownerName: property?.ownerName || "",
    ownerPhone: property?.ownerPhone || "",
    ownerEmail: property?.ownerEmail || "",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [newAmenity, setNewAmenity] = useState("");
  const [openSection, setOpenSection] = useState("basic");
  const [calculatedCommission, setCalculatedCommission] = useState(0);

  // Cerrar con ESC (UX pro)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Calcular comisión manualmente
  const handleCalculateCommission = () => {
    const price = parseFloat(formData.price || 0);
    const percentage = parseFloat(formData.commissionPercentage || 0);

    if (price <= 0 || percentage <= 0) {
      toast.error("Ingresa el precio y el porcentaje de comisión");
      return;
    }

    const commission = (price * percentage) / 100;
    setCalculatedCommission(commission);
    toast.success("Comisión calculada");
  };

  // Manejadores
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleAddCustomAmenity = () => {
    if (!newAmenity.trim()) return;
    setFormData((prev) => ({
      ...prev,
      customAmenities: [...prev.customAmenities, newAmenity.trim()],
    }));
    setNewAmenity("");
    toast.success("Amenidad agregada");
  };

  const handleRemoveCustomAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      customAmenities: prev.customAmenities.filter((a) => a !== amenity),
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const compressedFile = await compressImage(file);
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const storageRef = ref(storage, `properties/${timestamp}-${randomStr}-${file.name}`);
        await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(storageRef);
        return url;
      });

      const urls = await Promise.all(uploadPromises);
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast.success(`${files.length} imágenes subidas`);
    } catch (error) {
      console.error("Error subiendo imágenes:", error);
      toast.error("Error subiendo imágenes");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingDocs(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const storageRef = ref(storage, `documents/${timestamp}-${randomStr}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return { name: file.name, url };
      });

      const docs = await Promise.all(uploadPromises);
      setFormData((prev) => ({ ...prev, documents: [...prev.documents, ...docs] }));
      toast.success(`${files.length} documentos subidos`);
    } catch (error) {
      console.error("Error subiendo documentos:", error);
      toast.error("Error subiendo documentos");
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
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
    "Piscina",
    "Gimnasio",
    "Salón social",
    "Zonas verdes",
    "Parqueadero visitantes",
    "Portería 24/7",
    "Ascensor",
    "Balcón",
    "Terraza",
    "Patio",
    "Cocina integral",
    "Closets",
    "Aire acondicionado",
    "Calentador",
    "Gas natural",
    "Vigilancia",
    "CCTV",
    "Citófono",
    "Internet",
    "TV Cable",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // ✅ FIX: overlay sin scroll (evita doble scroll + saltos)
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        // ✅ El scroll queda solo aquí
        className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-primary">
            {property ? "Editar Propiedad" : "Nueva Propiedad"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
          >
            <FaTimes className="text-light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* INFORMACIÓN BÁSICA */}
          <Section
            id="basic"
            title="Información Básica"
            icon={FaHome}
            isOpen={openSection === "basic"}
            onToggle={() => setOpenSection(openSection === "basic" ? null : "basic")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-light mb-2 font-semibold">Título de la propiedad</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Casa campestre en Anserma con piscina"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Tipo de propiedad</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="lote">Lote</option>
                  <option value="local">Local comercial</option>
                  <option value="finca">Finca</option>
                  <option value="oficina">Oficina</option>
                </select>
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Tipo de negocio</label>
                <select
                  name="transactionType"
                  value={formData.transactionType}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="venta">Venta</option>
                  <option value="arriendo">Arriendo</option>
                </select>
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">
                  {formData.transactionType === "venta" ? "Precio de venta" : "Canon de arriendo"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">$</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Estado actual</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservada">Reservada</option>
                  <option value="arrendada">Arrendada</option>
                  <option value="vendida">Vendida</option>
                </select>
              </div>

              {/* COMISIONES */}
              <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <FaPercentage className="text-primary text-lg" />
                  <h4 className="text-light font-bold text-lg">Comisiones y honorarios</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-light mb-2 font-semibold">Comisión (%)</label>
                    <input
                      type="number"
                      name="commissionPercentage"
                      value={formData.commissionPercentage}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder={formData.transactionType === "venta" ? "3" : "100"}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                    <p className="text-slate-500 text-xs mt-1">
                      {formData.transactionType === "venta"
                        ? "Estándar 3% urbano, 5-8% rural"
                        : "Estándar 100% = 1 mes completo"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">&nbsp;</label>
                    <button
                      type="button"
                      onClick={handleCalculateCommission}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FaCalculator />
                      Calcular comisión
                    </button>
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">Comisión total</label>
                    <div className="w-full bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-lg px-4 py-3">
                      <div className="text-primary font-bold text-lg">{formatPrice(calculatedCommission)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DATOS DEL PROPIETARIO */}
              <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-light font-semibold mb-3">Datos del propietario</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-light mb-2 font-semibold">Nombre completo</label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      placeholder="Nombre del propietario"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">Teléfono</label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      placeholder="310 123 4567"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">Email</label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      placeholder="email@ejemplo.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-light mb-2 font-semibold">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe las características y ventajas de la propiedad..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </Section>

          {/* UBICACIÓN */}
          <Section
            id="location"
            title="Ubicación"
            icon={FaMapMarkerAlt}
            color="blue-500"
            isOpen={openSection === "location"}
            onToggle={() => setOpenSection(openSection === "location" ? null : "location")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-light mb-2 font-semibold">Departamento</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Ciudad / Municipio</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Barrio / Sector</label>
                <input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Dirección completa</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Cra 5 # 9-28"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              {formData.address && (
                <div className="md:col-span-2">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaMapMarkedAlt className="text-primary" />
                      <span className="text-light font-semibold">Ubicación en el mapa</span>
                    </div>
                    <div className="bg-slate-900 rounded-lg h-64 flex items-center justify-center">
                      <p className="text-slate-500 text-center px-4">
                        Mapa se generará automáticamente con:
                        <br />
                        <span className="text-light">
                          {formData.address}, {formData.city}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* CARACTERÍSTICAS */}
          <Section
            id="features"
            title="Características Principales"
            icon={FaCog}
            color="green-500"
            isOpen={openSection === "features"}
            onToggle={() => setOpenSection(openSection === "features" ? null : "features")}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-light mb-2 font-semibold">Área total (m²)</label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              {formData.type !== "lote" && (
                <div>
                  <label className="block text-light mb-2 font-semibold">Área construida (m²)</label>
                  <input
                    type="number"
                    name="builtArea"
                    value={formData.builtArea}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-light mb-2 font-semibold">Estrato</label>
                <select
                  name="stratum"
                  value={formData.stratum}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>

              {(formData.type === "casa" || formData.type === "apartamento" || formData.type === "finca") && (
                <>
                  <div>
                    <label className="block text-light mb-2 font-semibold">Habitaciones</label>
                    <input
                      type="number"
                      name="rooms"
                      value={formData.rooms}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2 font-semibold">Baños</label>
                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-light mb-2 font-semibold">Parqueaderos</label>
                <input
                  type="number"
                  name="parkingSpots"
                  value={formData.parkingSpots}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Pisos / Niveles</label>
                <input
                  type="number"
                  name="floors"
                  value={formData.floors}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Año de construcción</label>
                <input
                  type="number"
                  name="yearBuilt"
                  value={formData.yearBuilt}
                  onChange={handleChange}
                  placeholder="2020"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>
          </Section>

          {/* AMENIDADES */}
          <Section
            id="amenities"
            title="Amenidades"
            icon={FaBalanceScale}
            color="purple-500"
            isOpen={openSection === "amenities"}
            onToggle={() => setOpenSection(openSection === "amenities" ? null : "amenities")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableAmenities.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity)}
                    onChange={() => handleAmenityToggle(amenity)}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span className="text-light text-sm">{amenity}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-700 mt-4">
              <h4 className="text-light font-semibold mb-3">Amenidades personalizadas</h4>
              <div className="flex gap-2 mb-3">
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
                  placeholder="Ej: Cancha de tenis, Zona BBQ..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAmenity}
                  className="px-6 py-3 bg-primary hover:bg-yellow-500 text-slate-950 font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaPlus />
                  Agregar
                </button>
              </div>

              {formData.customAmenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.customAmenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-full px-3 py-1"
                    >
                      <span className="text-slate-200 text-xs">{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomAmenity(amenity)}
                        className="text-red-400 hover:text-red-300 text-xs"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* JURÍDICO */}
          <Section
            id="legal"
            title="Información Legal"
            icon={FaFileAlt}
            color="yellow-500"
            isOpen={openSection === "legal"}
            onToggle={() => setOpenSection(openSection === "legal" ? null : "legal")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-light mb-2 font-semibold">Ficha catastral</label>
                <input
                  type="text"
                  name="cadastralReference"
                  value={formData.cadastralReference}
                  onChange={handleChange}
                  placeholder="Ej: 123-456-789"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Matrícula inmobiliaria</label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="XXX-XXXXX"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Impuesto predial anual</label>
                <input
                  type="number"
                  name="propertyTax"
                  value={formData.propertyTax}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-light mb-2 font-semibold">Administración (mensual)</label>
                <input
                  type="number"
                  name="administrationFee"
                  value={formData.administrationFee}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="horizontalProperty"
                    checked={formData.horizontalProperty}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span className="text-light text-sm">Propiedad horizontal (PH)</span>
                </label>
              </div>
            </div>
          </Section>

          {/* ARRIENDO */}
          {formData.transactionType === "arriendo" && (
            <Section
              id="rent"
              title="Información de Arriendo"
              icon={FaBalanceScale}
              color="blue-500"
              isOpen={openSection === "rent"}
              onToggle={() => setOpenSection(openSection === "rent" ? null : "rent")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-light mb-2 font-semibold">Depósito (meses)</label>
                  <input
                    type="number"
                    name="rentalDeposit"
                    value={formData.rentalDeposit}
                    onChange={handleChange}
                    placeholder="1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-light mb-2 font-semibold">Tiempo mínimo (meses)</label>
                  <input
                    type="number"
                    name="minimumRentalPeriod"
                    value={formData.minimumRentalPeriod}
                    onChange={handleChange}
                    placeholder="6"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              </div>
            </Section>
          )}

          {/* MULTIMEDIA */}
          <Section
            id="media"
            title="Imágenes y Documentos"
            icon={FaImages}
            color="primary"
            isOpen={openSection === "media"}
            onToggle={() => setOpenSection(openSection === "media" ? null : "media")}
          >
            {/* Imágenes */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-light font-semibold">Imágenes</h4>
                <label className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2">
                  <FaPlus />
                  {uploadingImages ? "Subiendo..." : "Subir imágenes"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {formData.images.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay imágenes cargadas.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formData.images.map((url, index) => (
                    <div key={url + index} className="relative rounded-lg overflow-hidden border border-slate-700">
                      <img src={url} alt={`Imagen ${index + 1}`} className="w-full h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-red-300 rounded-full flex items-center justify-center transition-colors"
                        title="Eliminar imagen"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documentos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-light font-semibold">Documentos</h4>
                <label className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2">
                  <FaPlus />
                  {uploadingDocs ? "Subiendo..." : "Subir documentos"}
                  <input type="file" multiple className="hidden" onChange={handleDocumentUpload} />
                </label>
              </div>

              {formData.documents.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay documentos cargados.</p>
              ) : (
                <div className="space-y-2">
                  {formData.documents.map((docu, index) => (
                    <div
                      key={(docu?.url || docu?.name || "doc") + index}
                      className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-light text-sm font-semibold truncate">{docu?.name || "Documento"}</p>
                        {docu?.url && <p className="text-slate-500 text-xs truncate">{docu.url}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(index)}
                        className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center transition-colors"
                        title="Eliminar documento"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Botones de acción */}
          <div className="sticky bottom-0 bg-slate-950 border-t border-slate-800 px-6 py-4 flex gap-3 justify-end -mx-6 -mb-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-light rounded-xl font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary hover:bg-yellow-500 text-slate-950 font-bold rounded-xl transition-colors inline-flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              <FaSave />
              {loading ? "Guardando..." : property ? "Actualizar" : "Guardar Propiedad"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PropertyForm;
