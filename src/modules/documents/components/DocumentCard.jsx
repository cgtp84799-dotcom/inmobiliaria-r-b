import { motion } from 'framer-motion';
import { 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel, 
  FaFileImage, 
  FaFile,
  FaDownload,
  FaEye,
  FaTrash
} from 'react-icons/fa';
import { DOCUMENT_CATEGORY_LABELS } from '../types/document.types';

const DocumentCard = ({ document, onView, onDownload, onDelete }) => {
  const getFileIcon = (fileName) => {
    if (!fileName) return FaFile;
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') return FaFilePdf;
    if (['doc', 'docx'].includes(ext)) return FaFileWord;
    if (['xls', 'xlsx'].includes(ext)) return FaFileExcel;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return FaFileImage;
    
    return FaFile;
  };

  const getFileColor = (fileName) => {
    if (!fileName) return 'text-slate-400';
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') return 'text-red-500';
    if (['doc', 'docx'].includes(ext)) return 'text-blue-500';
    if (['xls', 'xlsx'].includes(ext)) return 'text-green-500';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'text-purple-500';
    
    return 'text-slate-400';
  };

  const FileIcon = getFileIcon(document.fileName);
  const fileColor = getFileColor(document.fileName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="card-soft p-5 border border-slate-800 hover:border-primary/50 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {/* Ícono del archivo */}
        <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 ${fileColor}`}>
          <FileIcon className="text-2xl" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-light font-semibold text-sm mb-1 line-clamp-1">
            {document.title || document.fileName || 'Sin título'}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
              {DOCUMENT_CATEGORY_LABELS[document.category] || 'Sin categoría'}
            </span>
            {document.uploadedAt && (
              <span>
                {new Date(document.uploadedAt).toLocaleDateString('es-CO')}
              </span>
            )}
          </div>

          {document.description && (
            <p className="text-muted text-xs line-clamp-2">
              {document.description}
            </p>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 mt-4">
        {onView && (
          <button
            onClick={() => onView(document)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg transition-all"
          >
            <FaEye />
            Ver
          </button>
        )}
        
        {onDownload && document.fileUrl && (
          <button
            onClick={() => onDownload(document)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs rounded-lg transition-all"
          >
            <FaDownload />
            Descargar
          </button>
        )}
        
        {onDelete && (
          <button
            onClick={() => onDelete(document)}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs rounded-lg transition-all"
          >
            <FaTrash />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default DocumentCard;