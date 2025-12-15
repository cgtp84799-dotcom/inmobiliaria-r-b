import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaVideo,
  FaUsers,
  FaSearch,
  FaEllipsisV,
  FaSpinner,
  FaComments,
  FaTimes,
  FaBell,
  FaBellSlash,
  FaInfoCircle,
  FaUserCircle,
  FaCheckCircle,
  FaImage,
  FaFileAlt,
  FaFilter,
  FaCalendarAlt
} from 'react-icons/fa';
import { useAuth } from '../../../core/contexts/AuthContext';
import { ref as rtdbRef, onValue } from 'firebase/database';
import { rtdb } from '../../../core/config/firebase.config';
import {
  initializeGroup,
  subscribeToMessages,
  sendMessage,
  uploadFile,
  uploadAudio,
  editMessage,
  deleteMessage,
  reactToMessage,
  markAsRead,
  notifyTyping
} from '../services/chatService';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import VideoCallModal from '../components/VideoCallModal';
import UserProfileModal from '../components/UserProfileModal';
import NotificationCenter from '../../../core/components/NotificationCenter'; // ✅ IMPORTAR
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Presencia de usuarios en tiempo real
  useEffect(() => {
    if (!currentUser) return;

    const statusRef = rtdbRef(rtdb, 'status');
    
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const statuses = snapshot.val();
      
      if (!statuses) {
        setOnlineUsers([]);
        return;
      }

      const onlineUsersList = Object.entries(statuses)
        .filter(([uid, status]) => {
          return (
            status.state === 'online' && 
            uid !== currentUser.uid &&
            status.email && 
            status.email.includes('@')
          );
        })
        .map(([uid, status]) => ({
          id: uid,
          uid: uid,
          displayName: status.displayName || status.email?.split('@')[0] || 'Usuario',
          email: status.email || '',
          photoURL: status.photoURL || null,
          role: status.role || 'agent',
          state: status.state,
          last_changed: status.last_changed
        }));

      setOnlineUsers(onlineUsersList);
    }, (error) => {
      console.error('Error escuchando presencia:', error);
      setOnlineUsers([]);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Escuchar indicador "escribiendo..."
  useEffect(() => {
    if (!currentUser) return;

    const typingRef = rtdbRef(rtdb, 'typing');
    
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const typing = snapshot.val();
      
      if (!typing) {
        setTypingUsers({});
        return;
      }

      const typingFiltered = Object.entries(typing)
        .filter(([uid]) => uid !== currentUser.uid)
        .reduce((acc, [uid, data]) => {
          if (data && Object.values(data).some(t => t.isTyping)) {
            acc[uid] = data;
          }
          return acc;
        }, {});

      setTypingUsers(typingFiltered);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Inicializar chat y mensajes
  useEffect(() => {
    const init = async () => {
      try {
        await initializeGroup();
        
        const unsubscribe = subscribeToMessages((newMessages) => {
          setMessages(newMessages);
          setLoading(false);
          scrollToBottom();
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error inicializando chat:', error);
        toast.error('Error al cargar el chat');
        setLoading(false);
      }
    };

    init();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (currentUser && messages.length > 0) {
      markAsRead(currentUser.uid);
    }
  }, [messages, currentUser]);

  const handleSendMessage = async (text) => {
    try {
      await sendMessage(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.photoURL,
        text,
        replyingTo
      );
      setReplyingTo(null);
      
      notifyTyping(currentUser.uid, false);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      toast.error('Error al enviar');
    }
  };

  const handleSendFile = async (file) => {
    try {
      const toastId = toast.loading('Subiendo archivo...');
      await uploadFile(
        file,
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.photoURL
      );
      toast.success('✓ Archivo enviado', { id: toastId });
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir archivo');
    }
  };

  const handleSendAudio = async (audioBlob, duration) => {
    try {
      const toastId = toast.loading('Enviando audio...');
      await uploadAudio(
        audioBlob,
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.photoURL,
        duration
      );
      toast.success('✓ Audio enviado', { id: toastId });
    } catch (error) {
      console.error('Error subiendo audio:', error);
      toast.error('Error al enviar audio');
      throw error;
    }
  };

  const handleEditMessage = async (message) => {
    setEditingMessage(message);
  };

  const handleConfirmEdit = async (newText) => {
    try {
      await editMessage(editingMessage.id, newText);
      setEditingMessage(null);
      toast.success('✓ Mensaje editado');
    } catch (error) {
      console.error('Error editando mensaje:', error);
      toast.error('Error al editar');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
      toast.success('✓ Mensaje eliminado');
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await reactToMessage(messageId, currentUser.uid, emoji);
    } catch (error) {
      console.error('Error reaccionando:', error);
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
  };

  // Filtros avanzados
  const filteredMessages = messages.filter(msg => {
    if (filterType === 'images' && msg.type !== 'image') return false;
    if (filterType === 'documents' && !['file', 'pdf', 'document', 'spreadsheet'].includes(msg.type)) return false;
    if (filterType === 'audio' && msg.type !== 'audio') return false;

    if (!searchTerm) return true;
    
    return (
      msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.fileName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Agrupar mensajes por fecha
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(msg => {
      const date = msg.createdAt;
      let dateKey;
      
      if (isToday(date)) {
        dateKey = 'Hoy';
      } else if (isYesterday(date)) {
        dateKey = 'Ayer';
      } else if (isSameWeek(date, new Date())) {
        dateKey = format(date, 'EEEE', { locale: es });
      } else if (isSameYear(date, new Date())) {
        dateKey = format(date, "d 'de' MMMM", { locale: es });
      } else {
        dateKey = format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(filteredMessages);

  // Estadísticas del chat
  const stats = {
    total: messages.length,
    images: messages.filter(m => m.type === 'image').length,
    documents: messages.filter(m => ['file', 'pdf', 'document', 'spreadsheet'].includes(m.type)).length,
    audios: messages.filter(m => m.type === 'audio').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FaSpinner className="text-yellow-400 text-6xl mx-auto mb-4" />
          </motion.div>
          <p className="text-white font-bold text-xl">Cargando chat...</p>
          <p className="text-slate-400 text-sm mt-2">Conectando con Firebase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* HEADER - z-index: 10 */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b-2 border-slate-700/50 px-4 md:px-6 py-3 md:py-4 flex-shrink-0 shadow-2xl relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <motion.div 
                className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <FaUsers className="text-slate-900 text-xl md:text-2xl" />
              </motion.div>
              <motion.span 
                className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 border-2 md:border-3 border-slate-900 rounded-full shadow-lg"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-black text-white truncate">
                Chat General
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs md:text-sm text-yellow-400 font-bold truncate">
                  Rincón Bedoya & Asociados
                </p>
                <span className="text-xs text-slate-500 hidden sm:inline">•</span>
                <p className="text-xs text-green-400 font-semibold flex items-center gap-1 hidden sm:flex">
                  <FaCheckCircle className="text-[10px]" />
                  {onlineUsers.length} en línea
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Búsqueda - Desktop */}
            <div className="relative hidden lg:block">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar mensajes..."
                className="bg-slate-800/80 border-2 border-slate-700 rounded-xl pl-11 pr-10 py-2.5 md:py-3 text-white text-sm placeholder-slate-400 focus:border-yellow-400 focus:outline-none w-64 xl:w-80 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-10"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Búsqueda - Mobile */}
            <button
              onClick={() => {
                const term = prompt('Buscar en el chat:');
                if (term) setSearchTerm(term);
              }}
              className="lg:hidden w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all border-2 border-slate-700"
            >
              <FaSearch className="text-yellow-400" />
            </button>

            {/* Filtros */}
            <div className="relative hidden md:block">
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all border-2 ${
                  filterType !== 'all'
                    ? 'bg-yellow-400 border-yellow-400 text-slate-900'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-yellow-400 text-yellow-400'
                }`}
              >
                <FaFilter />
              </motion.button>

              <AnimatePresence>
                {showFilters && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowFilters(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-56 bg-slate-800 border-2 border-slate-700 rounded-xl shadow-2xl z-[70] overflow-hidden"
                    >
                      <div className="p-2">
                        {[
                          { key: 'all', icon: <FaComments />, label: 'Todos', count: stats.total },
                          { key: 'images', icon: <FaImage />, label: 'Imágenes', count: stats.images },
                          { key: 'documents', icon: <FaFileAlt />, label: 'Documentos', count: stats.documents },
                          { key: 'audio', icon: '🎤', label: 'Audios', count: stats.audios }
                        ].map(filter => (
                          <button
                            key={filter.key}
                            onClick={() => { setFilterType(filter.key); setShowFilters(false); }}
                            className={`w-full px-4 py-2.5 text-left rounded-lg transition-colors flex items-center gap-3 text-sm ${
                              filterType === filter.key ? 'bg-yellow-400 text-slate-900 font-bold' : 'text-white hover:bg-slate-700'
                            }`}
                          >
                            {filter.icon}
                            {filter.label} ({filter.count})
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Videollamada */}
            <motion.button
              onClick={() => setShowVideoCall(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 rounded-xl font-black transition-all shadow-lg shadow-yellow-500/30 flex items-center gap-2"
            >
              <FaVideo className="text-base md:text-lg" />
              <span className="hidden xl:inline text-sm md:text-base">Videollamada</span>
            </motion.button>

            {/* Info grupo */}
            <motion.button
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all border-2 border-slate-700 hover:border-yellow-400"
            >
              <FaInfoCircle className="text-yellow-400 text-lg md:text-xl" />
            </motion.button>

            {/* ✅ CENTRO DE NOTIFICACIONES */}
            <NotificationCenter />

            {/* Botón de Perfil de Usuario */}
            <motion.button
              onClick={() => setShowUserProfile(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex-shrink-0"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Perfil"
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-yellow-400 hover:border-yellow-300 transition-all shadow-lg"
                />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center border-2 border-yellow-400 hover:border-yellow-300 transition-all shadow-lg">
                  <FaUserCircle className="text-slate-900 text-2xl" />
                </div>
              )}
            </motion.button>

            {/* Menú */}
            <div className="relative">
              <motion.button
                onClick={() => setShowMenu(!showMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all border-2 border-slate-700 hover:border-yellow-400"
              >
                <FaEllipsisV className="text-white" />
              </motion.button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-64 md:w-72 bg-slate-800 border-2 border-slate-700 rounded-xl shadow-2xl z-[70] overflow-hidden"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setNotificationsEnabled(!notificationsEnabled);
                            toast.success(
                              notificationsEnabled ? '🔕 Notificaciones silenciadas' : '🔔 Notificaciones activadas'
                            );
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-3"
                        >
                          {notificationsEnabled ? (
                            <FaBellSlash className="text-yellow-400 text-lg" />
                          ) : (
                            <FaBell className="text-green-400 text-lg" />
                          )}
                          <span className="font-semibold text-sm md:text-base">
                            {notificationsEnabled ? 'Silenciar' : 'Activar'} notificaciones
                          </span>
                        </button>
                        
                        <button
                          onClick={() => {
                            toast(
                              `📊 Total: ${stats.total} | 🖼️ Imágenes: ${stats.images} | 📄 Docs: ${stats.documents} | 🎤 Audios: ${stats.audios}`,
                              { icon: '📊', duration: 5000 }
                            );
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-3"
                        >
                          <FaInfoCircle className="text-blue-400 text-lg" />
                          <span className="font-semibold text-sm md:text-base">Estadísticas del chat</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL LATERAL - z-index: 40 */}
      <AnimatePresence>
        {showGroupInfo && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setShowGroupInfo(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-slate-900/98 backdrop-blur-xl border-l-2 border-slate-700 z-40 shadow-2xl overflow-y-auto custom-scrollbar"
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-black text-yellow-400">Información</h2>
                  <button
                    onClick={() => setShowGroupInfo(false)}
                    className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <FaTimes className="text-white" />
                  </button>
                </div>

                {/* Info del grupo */}
                <div className="bg-slate-800/70 rounded-2xl p-5 md:p-6 mb-6 border-2 border-slate-700">
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-yellow-500/30">
                      <FaUsers className="text-3xl md:text-4xl text-slate-900" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white">Chat General</h3>
                    <p className="text-sm text-slate-400 mt-1">Grupo de trabajo interno</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-white font-semibold">
                        💬 Mensajes: <span className="text-yellow-400">{stats.total}</span>
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-white font-semibold">
                        👥 Usuarios: <span className="text-green-400">{onlineUsers.length} en línea</span>
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-white font-semibold">
                        🖼️ Imágenes: <span className="text-blue-400">{stats.images}</span>
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-white font-semibold">
                        📄 Documentos: <span className="text-purple-400">{stats.documents}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de usuarios */}
                <div className="bg-slate-800/70 rounded-2xl p-4 border-2 border-slate-700">
                  <h3 className="text-sm font-bold text-yellow-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <FaUsers className="text-yellow-400" />
                    USUARIOS ACTIVOS
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {onlineUsers.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-8">
                        No hay usuarios en línea
                      </p>
                    ) : (
                      onlineUsers.map(user => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-700/50 rounded-xl transition-all border border-slate-700/50"
                        >
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName}
                              className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover border-2 border-yellow-400"
                            />
                          ) : (
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                              <FaUserCircle className="text-slate-900 text-2xl" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {user.displayName}
                            </p>
                            <p className="text-xs text-green-400 flex items-center gap-1 font-semibold">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              En línea
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ÁREA DE MENSAJES - z-index: 1 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4 custom-scrollbar relative z-[1]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)),
            url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='%230f172a'/%3E%3Cpath d='M30 0v60M0 30h60' stroke='%231e293b' stroke-width='0.5' opacity='0.15'/%3E%3C/svg%3E")
          `,
          backgroundSize: '60px 60px'
        }}
      >
        {Object.keys(messageGroups).length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full px-4"
          >
            <div className="bg-slate-800/80 backdrop-blur-lg rounded-3xl p-12 md:p-16 max-w-lg text-center border-2 border-slate-700 shadow-2xl">
              <FaComments className="text-slate-600 text-6xl md:text-8xl mx-auto mb-6" />
              <p className="text-white text-xl md:text-2xl font-bold mb-3">
                {searchTerm || filterType !== 'all' ? 'Sin resultados' : 'Sin mensajes'}
              </p>
              <p className="text-slate-400 text-sm md:text-base">
                {searchTerm || filterType !== 'all'
                  ? 'Intenta con otros filtros o términos de búsqueda'
                  : 'Sé el primero en escribir en el chat 👋'
                }
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            {Object.entries(messageGroups).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex items-center justify-center my-6">
                  <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-slate-700 shadow-lg">
                    <p className="text-xs md:text-sm text-slate-300 font-bold flex items-center gap-2">
                      <FaCalendarAlt className="text-yellow-400" />
                      {dateKey}
                    </p>
                  </div>
                </div>

                {msgs.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.userId === currentUser?.uid}
                    currentUserId={currentUser?.uid}
                    onReply={handleReplyToMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReact={handleReactToMessage}
                  />
                ))}
              </div>
            ))}

            <AnimatePresence>
              {Object.keys(typingUsers).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 backdrop-blur-sm rounded-2xl max-w-xs border border-slate-700/50"
                >
                  <div className="flex gap-1">
                    <motion.span
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-yellow-400 rounded-full"
                    />
                    <motion.span
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-yellow-400 rounded-full"
                    />
                    <motion.span
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-yellow-400 rounded-full"
                    />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">
                    Alguien está escribiendo...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* INPUT DE MENSAJES - z-index: 20 */}
      <div className="relative z-20">
        <MessageInput
          onSendMessage={editingMessage ? handleConfirmEdit : handleSendMessage}
          onSendFile={handleSendFile}
          onSendAudio={handleSendAudio}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          disabled={!currentUser}
          currentUser={currentUser}
        />
      </div>

      {/* MODAL DE VIDEOLLAMADA - z-index: 100 */}
      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        roomName="inmobiliaria-general-room"
        userName={currentUser?.displayName || currentUser?.email}
      />

      {/* MODAL DE PERFIL DE USUARIO - z-index: 100 */}
      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />

      {/* ESTILOS PERSONALIZADOS PARA SCROLLBAR */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #fbbf24, #f59e0b);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #f59e0b, #d97706);
        }
      `}</style>
    </div>
  );
};

export default ChatPage;