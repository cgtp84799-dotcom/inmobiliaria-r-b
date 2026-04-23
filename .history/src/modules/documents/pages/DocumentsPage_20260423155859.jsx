import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaFileUpload,
  FaFilter,
  FaSearch,
  FaFolder,
  FaSpinner,
  FaTimesCircle
} from 'react-icons/fa';
import { documentService } from '../services/document.service';
import { DOCUMENT_CATEGORY_LABELS } from '../types/document.types';
import DocumentCard from '../components/DocumentCard';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';
import { useAuth } from '../../../core/contexts/AuthContext'; // ✅
import { hasPermission } from '../../users/types/user.types'; // ✅

const DocumentsPage = () => {
  const { currentUser, userData } = useAuth();

  // ✅ Permisos granulares
// ✅ DESPUÉS
  const canCreate = hasPermission(userData?.role, 'documents', 'create');
  const canDelete = hasPermission(userData?.role, 'documents', 'delete');

  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    document: null,
  });

  const [filters, setFilters] = useState({ searchTerm: '', category: '' });

  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: '',
    file: null
  });

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getAllDocuments();
      setDocuments(data);
      setFilteredDocuments(data);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    let filtered = [...documents];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title?.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term) ||
        doc.fileName?.toLowerCase().includes(term)
      );
    }
    if (filters.category) {
      filtered = filtered.filter(doc => doc.category === filters.category);
    }
    setFilteredDocuments(filtered);
  };

  const clearFilters = () => {
    setFilters({ searchTerm: '', category: '' });
    setFilteredDocuments(documents);
  };

  const handleView = (document) => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    } else {
      toast.error('No hay archivo asociado');
    }
  };

  const handleDownload = (document) => {
    if (document.fileUrl) {
      const link = window.document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.fileName || 'documento';
      link.click();
      toast.success('Descarga iniciada');
    } else {
      toast.error('No hay archivo para descargar');
    }
  };

  const handleDelete = (document) => {
    setConfirmModal({ isOpen: true, document });
  };

  const confirmDelete = async () => {
    try {
      await documentService.deleteDocument(confirmModal.document.id);
      toast.success('Documento eliminado');
      setConfirmModal({ isOpen: false, document: null });
      loadDocuments();
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('Error al eliminar documento');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.title || !uploadData.category || !uploadData.file) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    try {
      await documentService.createDocument(
        {
          title: uploadData.title,
          description: uploadData.description,
          category: uploadData.category,
          entityType: 'general',
          entityId: null
        },
        uploadData.file
      );
      toast.success('Documento subido exitosamente');
      setUploadModalOpen(false);
      setUploadData({ title: '', description: '', category: '', file: null });
      loadDocuments();
    } catch (error) {
      console.error('Error subiendo documento:', error);
      toast.error('Error al subir documento');
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">
            Gestión Documental
          </h1>
          <p className="text-muted text-sm">
            Contratos, escrituras, certificados y más documentos centralizados
          </p>
        </div>

        {/* ✅ Solo visible si puede crear */}
        {canCreate && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="button-gold inline-flex items-center gap-2 px-6 py-3"
          >
            <FaFileUpload />
            Subir documento
          </button>
        )}
      </motion.div>

      {/* FILTROS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="card-soft border border-slate-800/80"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FaFilter className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-light">Filtros</h2>
              <p className="text-xs text-slate-400">Busca documentos específicos</p>
            </div>
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="text-xs text-primary hover:underline"
          >
            {filtersOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Búsqueda</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por título, descripción..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoría</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3 md:col-span-3">
              <button
                onClick={applyFilters}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-primary text-slate-950 font-semibold text-sm py-2.5 px-6 rounded-xl hover:bg-yellow-500 transition-all"
              >
                <FaSearch />
                Buscar
              </button>
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1 px-4 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl py-2.5 hover:border-slate-600 transition-all"
              >
                <FaTimesCircle />
                Limpiar
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* CONTADOR */}
      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-slate-400 text-sm">
            <span className="text-primary font-bold">{filteredDocuments.length}</span>{' '}
            {filteredDocuments.length === 1 ? 'documento encontrado' : 'documentos encontrados'}
          </p>
        </motion.div>
      )}

      {/* LISTADO */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-soft py-16 text-center"
        >
          <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando documentos...</p>
        </motion.div>
      ) : filteredDocuments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-soft py-16 px-6 text-center border border-dashed border-slate-700"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <FaFolder className="text-primary text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-light mb-2">
            {documents.length === 0 ? 'Aún no hay documentos' : 'No se encontraron documentos'}
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            {documents.length === 0
              ? 'Sube tu primer documento usando el botón de arriba.'
              : 'Intenta ajustar los filtros de búsqueda.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              canDelete={canDelete} // ✅ viewer recibe false, no ve el botón
            />
          ))}
        </motion.div>
      )}

      {/* MODAL DE SUBIDA — solo accesible si canCreate */}
      {uploadModalOpen && canCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-soft max-w-lg w-full p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">Subir documento</h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ej: Contrato arriendo - Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecciona una categoría</option>
                  {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Detalles adicionales del documento..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Archivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary/20 file:text-primary file:cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 button-gold">
                  Subir documento
                </button>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ConfirmModal eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Eliminar documento"
        message={`¿Seguro que quieres eliminar "${confirmModal.document?.title || confirmModal.document?.fileName}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, document: null })}
        confirmText="Sí, eliminar"
      />
    </div>
  );
};

export default DocumentsPage;