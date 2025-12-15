import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaReply,
  FaEdit,
  FaTrash,
  FaEllipsisV,
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaDownload,
  FaPlay,
  FaPause,
  FaUserCircle,
  FaTimes,
  FaExpand
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MessageBubble = ({ message, isOwn, currentUserId, onReply, onEdit, onDelete, onReact }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  if (message.deleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div className={`max-w-md px-4 py-3 rounded-2xl ${
          isOwn 
            ? 'bg-slate-800/50 border-2 border-slate-700' 
            : 'bg-slate-900/50 border-2 border-slate-800'
        }`}>
          <p className="text-slate-500 italic text-sm">
            🗑️ Este mensaje fue eliminado
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {format(message.createdAt, 'HH:mm', { locale: es })}
          </p>
        </div>
      </motion.div>
    );
  }

  const formatTime = (date) => {
    if (!date) return '';
    try {
      return format(date, 'HH:mm', { locale: es });
    } catch {
      return '';
    }
  };

  const getFileIcon = (type) => {
    if (type === 'pdf') return <FaFilePdf className="text-red-400 text-2xl md:text-3xl" />;
    if (type === 'document') return <FaFileWord className="text-blue-400 text-2xl md:text-3xl" />;
    if (type === 'spreadsheet') return <FaFileExcel className="text-green-400 text-2xl md:text-3xl" />;
    return <FaFile className="text-slate-400 text-2xl md:text-3xl" />;
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

  const handleReact = (emoji) => {
    onReact(message.id, emoji);
    setShowReactions(false);
  };

  const handleDelete = () => {
    onDelete(message.id);
    setShowMenu(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 md:mb-4 group px-2 md:px-0`}
      >
        <div className={`flex gap-2 md:gap-3 max-w-[85%] md:max-w-2xl ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          {!isOwn && (
            <div className="flex-shrink-0">
              {message.userPhoto ? (
                <img 
                  src={message.userPhoto} 
                  alt={message.userName}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-yellow-400 shadow-lg"
                />
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                  <FaUserCircle className="text-slate-900 text-lg md:text-2xl" />
                </div>
              )}
            </div>
          )}

          {/* Mensaje */}
          <div className="flex flex-col min-w-0">
            {/* Nombre del usuario */}
            {!isOwn && (
              <span className="text-xs font-bold text-yellow-400 mb-1 ml-3 truncate">
                {message.userName}
              </span>
            )}

            {/* Contenido del mensaje */}
            <div className="relative">
              <div
                className={`rounded-2xl px-4 md:px-5 py-2.5 md:py-3 shadow-xl ${
                  isOwn
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900'
                    : 'bg-slate-800 text-white border-2 border-slate-700'
                }`}
              >
                {/* Reply indicator */}
                {message.replyTo && (
                  <div className={`mb-2 md:mb-3 p-2 rounded-lg border-l-4 ${
                    isOwn 
                      ? 'bg-yellow-600/20 border-yellow-900' 
                      : 'bg-slate-700/50 border-yellow-400'
                  }`}>
                    <p className={`text-xs font-semibold ${
                      isOwn ? 'text-yellow-900' : 'text-yellow-400'
                    }`}>
                      ↩️ Respondiendo a
                    </p>
                    <p className={`text-xs truncate mt-1 ${
                      isOwn ? 'text-slate-800' : 'text-slate-300'
                    }`}>
                      {message.replyTo.text}
                    </p>
                  </div>
                )}

                {/* Contenido según tipo */}
                {message.type === 'text' && (
                  <p className={`text-sm md:text-base leading-relaxed break-words ${
                    isOwn ? 'text-slate-900 font-medium' : 'text-white'
                  }`}>
                    {message.text}
                  </p>
                )}

                {message.type === 'image' && (
                  <div className="space-y-2">
                    <div 
                      className="relative group/img cursor-pointer"
                      onClick={() => setShowImagePreview(true)}
                    >
                      <img
                        src={message.fileURL}
                        alt="Imagen"
                        className="rounded-xl max-w-full md:max-w-sm w-full hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <FaExpand className="text-white text-2xl md:text-3xl" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {message.text && (
                        <p className={`text-xs md:text-sm flex-1 ${isOwn ? 'text-slate-900' : 'text-white'}`}>
                          {message.text}
                        </p>
                      )}
                      <a
                        href={message.fileURL}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className={`ml-2 p-2 rounded-lg transition-colors flex-shrink-0 ${
                          isOwn 
                            ? 'bg-slate-900/20 hover:bg-slate-900/30 text-slate-900' 
                            : 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
                        }`}
                      >
                        <FaDownload className="text-sm" />
                      </a>
                    </div>
                  </div>
                )}

                {(message.type === 'file' || message.type === 'pdf' || message.type === 'document' || message.type === 'spreadsheet') && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    isOwn ? 'bg-yellow-600/20' : 'bg-slate-700/50'
                  }`}>
                    {getFileIcon(message.type)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs md:text-sm font-semibold truncate ${
                        isOwn ? 'text-slate-900' : 'text-white'
                      }`}>
                        {message.fileName}
                      </p>
                      <p className={`text-xs ${
                        isOwn ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {(message.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <a
                      href={message.fileURL}
                      download
                      className={`p-2 md:p-2.5 rounded-lg transition-colors flex-shrink-0 ${
                        isOwn 
                          ? 'bg-slate-900 hover:bg-slate-800 text-yellow-400' 
                          : 'bg-slate-600 hover:bg-slate-500 text-white'
                      }`}
                    >
                      <FaDownload className="text-sm md:text-base" />
                    </a>
                  </div>
                )}

                {message.type === 'audio' && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    isOwn ? 'bg-yellow-600/20' : 'bg-slate-700/50'
                  }`}>
                    <button
                      onClick={() => {
                        const audio = new Audio(message.fileURL);
                        if (isPlayingAudio) {
                          audio.pause();
                        } else {
                          audio.play();
                          audio.onended = () => setIsPlayingAudio(false);
                        }
                        setIsPlayingAudio(!isPlayingAudio);
                      }}
                      className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isOwn 
                          ? 'bg-slate-900 text-yellow-400' 
                          : 'bg-yellow-400 text-slate-900'
                      }`}
                    >
                      {isPlayingAudio ? <FaPause className="text-sm md:text-base" /> : <FaPlay className="ml-0.5 text-sm md:text-base" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`h-1.5 md:h-2 rounded-full ${
                        isOwn ? 'bg-yellow-700/30' : 'bg-slate-600'
                      }`}>
                        <div className={`h-full w-0 rounded-full ${
                          isOwn ? 'bg-slate-900' : 'bg-yellow-400'
                        }`}></div>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        🎤 {message.audioDuration || '0:00'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hora y estado */}
                <div className={`flex items-center gap-2 mt-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {message.edited && (
                    <span className={`text-xs italic ${
                      isOwn ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      editado
                    </span>
                  )}
                  <p className={`text-xs font-medium ${
                    isOwn ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {formatTime(message.createdAt)}
                  </p>
                  {isOwn && (
                    <span className="text-xs">
                      {message.readBy?.length > 1 ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>

              {/* Reactions */}
              {message.reactions && Object.keys(message.reactions).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-2 ${isOwn ? 'justify-end mr-3' : 'justify-start ml-3'}`}>
                  {Object.entries(message.reactions).map(([emoji, users]) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReact(emoji)}
                      className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs flex items-center gap-1 shadow-lg ${
                        users.includes(currentUserId)
                          ? 'bg-yellow-400 text-slate-900 font-bold border-2 border-yellow-500'
                          : 'bg-slate-700 text-white border-2 border-slate-600'
                      }`}
                    >
                      <span className="text-sm md:text-base">{emoji}</span>
                      <span className="font-semibold text-xs">{users.length}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Menu de acciones */}
              <div className={`absolute top-1 md:top-2 ${isOwn ? 'left-1 md:left-2' : 'right-1 md:right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors ${
                      isOwn 
                        ? 'bg-yellow-700/50 hover:bg-yellow-700 text-slate-900' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    <FaEllipsisV className="text-xs" />
                  </button>

                  <AnimatePresence>
                    {showMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`absolute ${isOwn ? 'left-0' : 'right-0'} mt-2 w-44 md:w-48 bg-slate-800 border-2 border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden`}
                        >
                          <button
                            onClick={() => {
                              setShowReactions(true);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 md:px-4 py-2 md:py-2.5 text-left text-white hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs md:text-sm"
                          >
                            <span className="text-base md:text-lg">😊</span>
                            Reaccionar
                          </button>
                          <button
                            onClick={() => {
                              onReply(message);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 md:px-4 py-2 md:py-2.5 text-left text-white hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs md:text-sm"
                          >
                            <FaReply className="text-blue-400" />
                            Responder
                          </button>
                          {isOwn && message.type === 'text' && (
                            <button
                              onClick={() => {
                                onEdit(message);
                                setShowMenu(false);
                              }}
                              className="w-full px-3 md:px-4 py-2 md:py-2.5 text-left text-white hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs md:text-sm"
                            >
                              <FaEdit className="text-yellow-400" />
                              Editar
                            </button>
                          )}
                          {isOwn && (
                            <button
                              onClick={handleDelete}
                              className="w-full px-3 md:px-4 py-2 md:py-2.5 text-left text-red-400 hover:bg-red-900/30 transition-colors flex items-center gap-2 text-xs md:text-sm border-t border-slate-700"
                            >
                              <FaTrash className="text-xs md:text-sm" />
                              Eliminar
                            </button>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {/* Panel de reacciones */}
                  <AnimatePresence>
                    {showReactions && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowReactions(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`absolute ${isOwn ? 'left-0' : 'right-0'} mt-2 bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl z-50 p-2 md:p-3`}
                        >
                          <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                            {emojis.map(emoji => (
                              <motion.button
                                key={emoji}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleReact(emoji)}
                                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-lg md:text-xl transition-colors"
                              >
                                {emoji}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de vista previa de imagen */}
      <AnimatePresence>
        {showImagePreview && message.type === 'image' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImagePreview(false)}
          >
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-4 right-4 w-10 h-10 md:w-12 md:h-12 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <FaTimes className="text-white text-lg md:text-xl" />
            </button>
            <a
              href={message.fileURL}
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-4 right-4 px-4 md:px-6 py-2.5 md:py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-xl z-10"
            >
              <FaDownload className="text-sm md:text-base" />
              <span className="text-sm md:text-base">Descargar</span>
            </a>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={message.fileURL}
              alt="Vista previa"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reacciones mejoradas */}
{message.reactions && Object.keys(message.reactions).length > 0 && (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex gap-1 flex-wrap mt-2"
  >
    {Object.entries(
      Object.values(message.reactions).reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
      }, {})
    ).map(([emoji, count]) => (
      <motion.button
        key={emoji}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onReact(message.id, emoji)}
        className={`
          px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1
          ${isOwn 
            ? 'bg-slate-900/50 hover:bg-slate-900/70' 
            : 'bg-slate-700/50 hover:bg-slate-700/70'
          }
          border border-slate-600/50 transition-all
        `}
      >
        <span className="text-base">{emoji}</span>
        <span className="text-yellow-400">{count}</span>
      </motion.button>
    ))}
  </motion.div>
)}

    </>
  );
};

export default MessageBubble;