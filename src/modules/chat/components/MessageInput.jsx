import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPaperPlane,
  FaMicrophone,
  FaPaperclip,
  FaTimes,
  FaReply,
  FaEdit,
  FaSmile,
  FaImage
} from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { notifyTyping } from '../services/chatService';

const MessageInput = ({
  onSendMessage,
  onSendFile,
  onSendAudio,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  disabled = false,
  currentUser
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioStreamRef = useRef(null);
  const recordingTimeRef = useRef(0); // ✅ NUEVO: ref para mantener el tiempo actualizado

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.text || '');
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // ✅ NUEVO: Sincronizar recordingTime con ref
  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleTyping = () => {
    if (!currentUser || isRecording) return;

    notifyTyping(currentUser.uid, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      notifyTyping(currentUser.uid, false);
    }, 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage('');
    textareaRef.current.style.height = 'auto';
    
    if (currentUser) {
      notifyTyping(currentUser.uid, false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onSendFile) {
      onSendFile(file);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && onSendFile) {
      onSendFile(file);
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Iniciando grabación...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingTimeRef.current = 0;
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log('📦 Chunk de audio capturado:', e.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 Grabación detenida');
        console.log('📦 Total de chunks:', audioChunksRef.current.length);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('📊 Audio blob creado:', audioBlob.size, 'bytes');
        
        // ✅ USAR EL REF EN LUGAR DEL STATE
        const finalTime = recordingTimeRef.current > 0 ? recordingTimeRef.current : 1;
        console.log('⏱️ Duración final:', finalTime, 'segundos');
        
        if (onSendAudio && audioBlob.size > 0) {
          console.log('📤 Enviando audio...');
          try {
            await onSendAudio(audioBlob, finalTime);
            console.log('✅ Audio enviado correctamente');
          } catch (error) {
            console.error('❌ Error al enviar audio:', error);
          }
        } else {
          console.warn('⚠️ No se envió el audio. Tamaño:', audioBlob.size);
        }
        
        // Detener stream
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        
        setRecordingTime(0);
        recordingTimeRef.current = 0;
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('✅ MediaRecorder iniciado');

      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 Deteniendo grabación para enviar...');
      console.log('⏱️ Tiempo grabado:', recordingTimeRef.current, 'segundos');
      
      // Detener intervalo primero
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Detener grabación (esto dispara onstop)
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      console.log('❌ Cancelando grabación...');
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Detener stream sin enviar
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // Limpiar sin disparar onstop
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {
          console.log('Error deteniendo recorder:', e);
        }
        
        mediaRecorderRef.current = null;
      }
      
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      audioChunksRef.current = [];
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="bg-slate-900/95 backdrop-blur-xl border-t-2 border-slate-700/50 p-3 md:p-4 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay de drag & drop */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-yellow-400/20 backdrop-blur-sm border-4 border-dashed border-yellow-400 rounded-xl flex items-center justify-center z-50"
          >
            <div className="text-center">
              <FaImage className="text-yellow-400 text-6xl mx-auto mb-3" />
              <p className="text-white font-bold text-xl">Suelta para enviar</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de respuesta o edición */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 border-l-4 border-yellow-400 flex items-start justify-between"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {editingMessage ? (
                <FaEdit className="text-blue-400 text-lg flex-shrink-0 mt-1" />
              ) : (
                <FaReply className="text-yellow-400 text-lg flex-shrink-0 mt-1" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-yellow-400 mb-1">
                  {editingMessage ? 'Editando mensaje' : `Respondiendo a ${replyingTo?.userName}`}
                </p>
                <p className="text-sm text-slate-300 truncate">
                  {editingMessage?.text || replyingTo?.text || replyingTo?.fileName || '📎 Archivo adjunto'}
                </p>
              </div>
            </div>
            <button
              onClick={editingMessage ? onCancelEdit : onCancelReply}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            >
              <FaTimes className="text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowEmojiPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full mb-2 left-4 z-50"
            >
              <EmojiPicker 
                onEmojiClick={handleEmojiClick} 
                theme="dark"
                width={320}
                height={400}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input principal */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Botón de adjuntar */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <FaPaperclip className="text-lg" />
        </button>

        {/* Botón de emoji */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled || isRecording}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <FaSmile className="text-lg" />
        </button>

        {/* Área de texto */}
        <div className="flex-1 bg-slate-800 rounded-xl border-2 border-slate-700 focus-within:border-yellow-400 transition-all">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
              isRecording 
                ? `🎤 Grabando... ${formatRecordingTime(recordingTime)}` 
                : 'Escribe un mensaje...'
            }
            disabled={disabled || isRecording}
            className="w-full bg-transparent text-white px-4 py-3 resize-none focus:outline-none placeholder-slate-400 min-h-[48px] max-h-[120px]"
            rows={1}
          />
        </div>

        {/* Botones de audio/enviar */}
        {isRecording ? (
          <>
            {/* Botón CANCELAR */}
            <motion.button
              type="button"
              onClick={cancelRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all shadow-lg flex-shrink-0"
              title="Cancelar grabación"
            >
              <FaTimes className="text-lg" />
            </motion.button>
            
            {/* Botón ENVIAR AUDIO */}
            <motion.button
              type="button"
              onClick={stopRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all shadow-lg shadow-green-500/30 flex-shrink-0 flex items-center gap-2"
              title="Enviar audio"
            >
              <FaPaperPlane className="text-base" />
              <span className="text-sm font-bold hidden sm:inline">Enviar</span>
            </motion.button>
          </>
        ) : message.trim() ? (
          <motion.button
            type="submit"
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 rounded-xl transition-all shadow-lg shadow-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <FaPaperPlane className="text-lg" />
          </motion.button>
        ) : (
          <motion.button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-xl transition-all shadow-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaMicrophone className="text-lg" />
          </motion.button>
        )}
      </form>

      {/* Indicador de grabación */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-red-500 text-sm font-semibold">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Grabando audio: {formatRecordingTime(recordingTime)}
            </div>
            <p className="text-xs text-slate-400">
              Presiona <span className="text-green-400 font-bold">Enviar</span> o <span className="text-slate-300 font-bold">Cancelar</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageInput;