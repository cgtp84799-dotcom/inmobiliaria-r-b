import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash } from 'react-icons/fa';
import { useState, useEffect } from 'react';

const VideoCallModal = ({ isOpen, onClose, roomName, userName }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Jitsi API
  useEffect(() => {
    if (!isOpen) return;

    const loadJitsi = () => {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.body.appendChild(script);
    };

    const initJitsi = () => {
      if (window.JitsiMeetExternalAPI) {
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName || 'inmobiliaria-general-room',
          width: '100%',
          height: '100%',
          parentNode: document.querySelector('#jitsi-container'),
          userInfo: {
            displayName: userName || 'Usuario'
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'chat',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'stats',
              'shortcuts',
              'tileview',
              'download',
              'help',
              'mute-everyone'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#1e293b'
          }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);

        api.addEventListener('videoConferenceLeft', () => {
          onClose();
        });

        return () => {
          api.dispose();
        };
      }
    };

    if (!window.JitsiMeetExternalAPI) {
      loadJitsi();
    } else {
      initJitsi();
    }
  }, [isOpen, roomName, userName, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <FaVideo className="text-slate-900" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-light">Videollamada Grupal</h2>
              <p className="text-sm text-slate-400">Inmobiliaria Rincón Bedoya & Asociados</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <FaTimes />
            Salir de la llamada
          </button>
        </div>

        {/* Jitsi Container */}
        <div id="jitsi-container" className="flex-1 w-full" />
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;