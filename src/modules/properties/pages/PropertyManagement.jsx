import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaHome,
  FaMapMarkerAlt,
  FaDollarSign,
  FaFileDownload,
  FaChevronLeft,
  FaChevronRight,
  FaFileContract,
  FaUser,
  FaUserTie,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  where,
} from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";
import PropertyForm from "../components/PropertyForm";
import PropertyDetail from "../components/PropertyDetail";
import ConfirmModal from "../../../shared/components/UI/ConfirmModal";
import { useAuth } from "../../../core/contexts/AuthContext";
import { hasPermission } from "../../users/types/user.types";

const PAGE_SIZE = 12;

const PropertyManagement = () => {
  const { currentUser } = useAuth();
  const [activeContracts, setActiveContracts] = useState({}); // ✅

  // ✅ Permisos granulares
  const canCreate = hasPermission(currentUser?.role, "properties", "create");
  const canUpdate = hasPermission(currentUser?.role, "properties", "update");
  const canDelete = hasPermission(currentUser?.role, "properties", "delete");

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI / Modales
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // ✅ ConfirmModal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTransaction, setFilterTransaction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [pageCursors, setPageCursors] = useState({});

  const totalPages = useMemo(() => {
    const pages = Math.ceil((totalDocs || 0) / PAGE_SIZE);
    return pages <= 0 ? 1 : pages;
  }, [totalDocs]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      disponible: "bg-green-500/15 text-green-300 border-green-500/30",
      reservada: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      arrendada: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      vendida: "bg-red-500/15 text-red-300 border-red-500/30",
    };

    const labels = {
      disponible: "Disponible",
      reservada: "Reservada",
      arrendada: "Arrendada",
      vendida: "Vendida",
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          styles[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30"
        }`}
      >
        {labels[status] ?? status}
      </span>
    );
  };

  const cardAnim = (delay) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay },
  });

  const buildBaseQuery = () => {
    const constraints = [orderBy("createdAt", "desc")];
    return query(collection(db, "properties"), ...constraints);
  };

  const loadTotalCount = async () => {
    try {
      const qBase = buildBaseQuery();
      const snap = await getCountFromServer(qBase);
      setTotalDocs(snap.data().count || 0);
    } catch (err) {
      console.error("Error contando propiedades:", err);
      setTotalDocs(0);
    }
  };

  const loadPage = async (pageNumber) => {
    try {
      setLoading(true);

      const qBase = buildBaseQuery();

      let qPage;
      if (pageNumber === 1) {
        qPage = query(qBase, limit(PAGE_SIZE));
      } else {
        const prevCursor = pageCursors[pageNumber - 1];
        if (!prevCursor) {
          await hydrateCursorsUpTo(pageNumber - 1);
        }
        const cursor = pageCursors[pageNumber - 1] || null;
        qPage = cursor
          ? query(qBase, startAfter(cursor), limit(PAGE_SIZE))
          : query(qBase, limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(qPage);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProperties(data);

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setPageCursors((prev) => ({ ...prev, [pageNumber]: lastDoc }));

      setCurrentPage(pageNumber);
    } catch (error) {
      console.error("Error cargando página:", error);
      toast.error("Error al cargar propiedades");
    } finally {
      setLoading(false);
    }
  };

  const hydrateCursorsUpTo = async (targetPage) => {
    for (let p = 1; p <= targetPage; p++) {
      if (pageCursors[p]) continue;

      const qBase = buildBaseQuery();
      let qPage;

      if (p === 1) {
        qPage = query(qBase, limit(PAGE_SIZE));
      } else {
        const prev = pageCursors[p - 1];
        if (!prev) break;
        qPage = query(qBase, startAfter(prev), limit(PAGE_SIZE));
      }

      const snap = await getDocs(qPage);
      const last = snap.docs[snap.docs.length - 1] || null;
      setPageCursors((prev) => ({ ...prev, [p]: last }));
    }
  };

  useEffect(() => {
    (async () => {
      await loadTotalCount();
      await loadPage(1);
      // Cargar contratos activos para mostrar en tarjetas
      try {
        const snap = await getDocs(
          query(collection(db, "contracts"), where("statusGeneral", "in", ["vigente", "borrador", "pausado"]))
        );
        const map = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.propertyId) {
            const existing = map[data.propertyId];
            if (!existing || data.statusGeneral === "vigente") {
              map[data.propertyId] = { id: d.id, ...data };
            }
          }
        });
        setActiveContracts(map);
      } catch (e) {
        console.warn("Error cargando contratos:", e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (prop) =>
          prop.title?.toLowerCase().includes(term) ||
          prop.city?.toLowerCase().includes(term) ||
          prop.neighborhood?.toLowerCase().includes(term)
      );
    }

    if (filterType !== "all") filtered = filtered.filter((p) => p.type === filterType);
    if (filterTransaction !== "all")
      filtered = filtered.filter((p) => p.transactionType === filterTransaction);
    if (filterStatus !== "all") filtered = filtered.filter((p) => p.status === filterStatus);

    return filtered;
  }, [properties, searchTerm, filterType, filterTransaction, filterStatus]);

  const handleSaveProperty = async (propertyData) => {
    try {
      if (selectedProperty) {
        const propertyRef = doc(db, "properties", selectedProperty.id);
        await updateDoc(propertyRef, { ...propertyData, updatedAt: new Date() });
        toast.success("Propiedad actualizada correctamente");
      } else {
        await addDoc(collection(db, "properties"), {
          ...propertyData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success("Propiedad creada correctamente");
      }

      await loadTotalCount();
      const safePage = Math.min(
        currentPage,
        Math.max(1, Math.ceil(((totalDocs || 0) + 1) / PAGE_SIZE))
      );
      await loadPage(safePage);

      setShowForm(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error("Error guardando propiedad:", error);
      throw error;
    }
  };

  // ✅ CAMBIO — antes eliminaba directo sin confirmación
  const handleDeleteProperty = (propertyId) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar propiedad",
      message: "¿Seguro que quieres eliminar esta propiedad? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDoc(doc(db, "properties", propertyId));
          toast.success("Propiedad eliminada");

          await loadTotalCount();
          if (properties.length === 1 && currentPage > 1) {
            await loadPage(currentPage - 1);
          } else {
            await loadPage(currentPage);
          }
        } catch (error) {
          console.error("Error eliminando propiedad:", error);
          toast.error("Error al eliminar");
        }
      },
    });
  };

  const handleEditProperty = (property) => {
    setSelectedProperty(property);
    setShowForm(true);
    setShowDetail(false);
  };

  const handleViewDetail = (property) => {
    setSelectedProperty(property);
    setShowDetail(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };

const handleDownloadPDF = (property) => {
  setSelectedProperty(property);
  setShowDetail(true);
};

  const goPrev = () => {
    if (currentPage <= 1) return;
    loadPage(currentPage - 1);
  };

  const goNext = () => {
    if (currentPage >= totalPages) return;
    loadPage(currentPage + 1);
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    loadPage(p);
  };

  const pageButtons = useMemo(() => {
    const pages = totalPages;
    const c = currentPage;

    if (pages <= 3) return Array.from({ length: pages }, (_, i) => i + 1);

    let start = c - 1;
    let end = c + 1;

    if (start < 1) { start = 1; end = 3; }
    if (end > pages) { end = pages; start = pages - 2; }

    return [start, start + 1, start + 2];
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-1">
            Gestión de Propiedades
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Administra tu portafolio inmobiliario completo
          </p>
        </div>

        {/* ✅ Solo visible si puede crear */}
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="button-gold inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl w-full sm:w-auto"
          >
            <FaPlus />
            Nueva Propiedad
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar por título, ciudad, barrio... (en esta página)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="lote">Lote</option>
              <option value="local">Local</option>
              <option value="finca">Finca</option>
              <option value="oficina">Oficina</option>
            </select>
          </div>

          <div>
            <select
              value={filterTransaction}
              onChange={(e) => setFilterTransaction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">Venta y Arriendo</option>
              <option value="venta">Solo Venta</option>
              <option value="arriendo">Solo Arriendo</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-light focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="reservada">Reservada</option>
              <option value="arrendada">Arrendada</option>
              <option value="vendida">Vendida</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-slate-400 text-sm flex flex-wrap gap-2 items-center justify-between">
          <span>
            Página <span className="text-primary font-semibold">{currentPage}</span> de{" "}
            <span className="text-slate-200 font-semibold">{totalPages}</span>
          </span>
          <span className="text-slate-500 text-xs">
            Mostrando {filteredProperties.length} en esta página (12 por página)
          </span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 mt-4">Cargando propiedades...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <FaHome className="text-6xl text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron propiedades en esta página</p>
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 button-gold inline-flex items-center gap-2"
            >
              <FaPlus />
              Crear propiedad
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              {...cardAnim(index * 0.05)}
              onClick={() => handleViewDetail(property)}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 group cursor-pointer"
            >
              <div className="relative h-44 sm:h-48 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaHome className="text-6xl text-slate-700" />
                  </div>
                )}

                <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/75 backdrop-blur-sm rounded-lg text-[11px] font-semibold text-primary border border-primary/30">
                  {(property.type?.charAt(0).toUpperCase() ?? "") + (property.type?.slice(1) ?? "")}
                </div>

                <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-950/75 backdrop-blur-sm rounded-lg text-[11px] font-semibold text-blue-300 border border-blue-500/30">
                  {property.transactionType === "venta" ? "Venta" : "Arriendo"}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <h3 className="text-light font-bold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {property.title}
                </h3>

                <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                  <FaMapMarkerAlt className="text-primary" />
                  <span className="truncate">
                    {property.city}
                    {property.neighborhood ? `, ${property.neighborhood}` : ""}
                  </span>
                </div>

                <div className="flex items-end gap-2 mb-3">
                  <FaDollarSign className="text-green-400 mb-1" />
                  <span className="text-xl sm:text-2xl font-extrabold text-primary leading-tight">
                    {formatPrice(property.price)}
                  </span>
                  {property.transactionType === "arriendo" && (
                    <span className="text-slate-400 text-sm">/mes</span>
                  )}
                </div>

                {property.type !== "lote" && (
                  <div className="flex items-center gap-4 text-slate-400 text-sm mb-3 pb-3 border-b border-slate-800">
                    {property.rooms ? (
                      <div>
                        <span className="font-semibold text-light">{property.rooms}</span> hab.
                      </div>
                    ) : null}
                    {property.bathrooms ? (
                      <div>
                        <span className="font-semibold text-light">{property.bathrooms}</span> baños
                      </div>
                    ) : null}
                    {property.area ? (
                      <div>
                        <span className="font-semibold text-light">{property.area}</span> m²
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="mb-3">
                  <StatusBadge status={property.status} />
                </div>

                {activeContracts[property.id] && (() => {
                  const c = activeContracts[property.id];
                  const sLabel = { vigente: 'Vigente', borrador: 'Borrador', pausado: 'Pausado' };
                  const typeLabel = { venta: 'Venta', arriendo: 'Arriendo', promesa: 'Promesa' };
                  const isActive = c.statusGeneral === 'vigente';
                  return (
                    <div className={`mb-3 p-2.5 border rounded-xl ${isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
                      <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                        <FaFileContract size={10} />
                        {typeLabel[c.type] || c.type} · {sLabel[c.statusGeneral] || c.statusGeneral}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                        <FaUser size={9} className="text-slate-500" />
                        <span className="truncate">{c.clientName || c.clientEmail || '—'}</span>
                      </div>
                      {c.agentName && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-0.5">
                          <FaUserTie size={8} />
                          <span className="truncate">{c.agentName}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ✅ Botones controlados por permisos */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPDF(property);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-light rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    title="Descargar ficha técnica"
                  >
                    <FaFileDownload />
                    PDF
                  </button>

                  {canUpdate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProperty(property);
                      }}
                      className="flex-1 px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-primary/25"
                    >
                      <FaEdit />
                      Editar
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProperty(property.id);
                      }}
                      className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-xl transition-colors flex items-center justify-center border border-red-500/25"
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Paginación */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          onClick={goPrev}
          disabled={loading || currentPage === 1}
          className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 disabled:opacity-40 hover:border-primary/40 transition inline-flex items-center gap-2"
        >
          <FaChevronLeft />
          Anterior
        </button>

        {pageButtons.map((p) => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            disabled={loading}
            className={`w-10 h-10 rounded-xl border transition font-semibold ${
              p === currentPage
                ? "bg-primary text-slate-950 border-primary"
                : "bg-slate-900/60 border-slate-800 text-slate-200 hover:border-primary/40"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={goNext}
          disabled={loading || currentPage >= totalPages}
          className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 disabled:opacity-40 hover:border-primary/40 transition inline-flex items-center gap-2"
        >
          Siguiente
          <FaChevronRight />
        </button>
      </div>

      {/* Modal formulario */}
      <AnimatePresence>
        {showForm && (
          <PropertyForm
            property={selectedProperty}
            onClose={handleCloseForm}
            onSave={handleSaveProperty}
          />
        )}
      </AnimatePresence>

      {/* Modal detalle */}
      <AnimatePresence>
        {showDetail && selectedProperty && (
          <PropertyDetail
            property={selectedProperty}
            onClose={() => {
              setShowDetail(false);
              setSelectedProperty(null);
            }}
            onEdit={canUpdate ? handleEditProperty : null}
            onDelete={canDelete ? handleDeleteProperty : null}
          />
        )}
      </AnimatePresence>

      {/* ✅ ConfirmModal eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Sí, eliminar"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default PropertyManagement;