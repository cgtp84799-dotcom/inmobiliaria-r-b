import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  where,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as rtdbRef, set, remove } from 'firebase/database';
import { db, storage, rtdb } from '../../../core/config/firebase.config';

const CHAT_COLLECTION = 'groupChat';
const GROUP_ID = 'inmobiliaria-general';

export const initializeGroup = async () => {
  try {
    const groupRef = doc(db, CHAT_COLLECTION, GROUP_ID);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      await setDoc(groupRef, {
        name: 'Chat General - Inmobiliaria',
        description: 'Grupo de comunicación interna para todos los agentes',
        createdAt: serverTimestamp(),
        type: 'group',
        active: true
      });
      console.log('✅ Grupo inicializado correctamente');
    }
  } catch (error) {
    console.error('❌ Error inicializando grupo:', error);
    throw error;
  }
};

export const subscribeToMessages = (callback) => {
  const messagesRef = collection(db, CHAT_COLLECTION, GROUP_ID, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
    callback(messages);
  }, (error) => {
    console.error('❌ Error escuchando mensajes:', error);
  });
};

export const sendMessage = async (userId, userName, userPhoto, text, replyTo = null) => {
  try {
    const messagesRef = collection(db, CHAT_COLLECTION, GROUP_ID, 'messages');
    
    const messageData = {
      userId,
      userName,
      userPhoto: userPhoto || null,
      text,
      type: 'text',
      replyTo: replyTo || null,
      reactions: {},
      edited: false,
      deleted: false,
      createdAt: serverTimestamp(),
      readBy: [userId]
    };

    const docRef = await addDoc(messagesRef, messageData);
    console.log('✅ Mensaje enviado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    throw error;
  }
};

export const uploadFile = async (file, userId, userName, userPhoto) => {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const fileRef = storageRef(storage, `chat/${GROUP_ID}/${fileName}`);

    console.log('📤 Subiendo archivo:', fileName);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);

    let fileType = 'file';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type.includes('pdf')) fileType = 'pdf';
    else if (file.type.includes('word') || file.type.includes('document')) fileType = 'document';
    else if (file.type.includes('sheet') || file.type.includes('excel')) fileType = 'spreadsheet';

    const messagesRef = collection(db, CHAT_COLLECTION, GROUP_ID, 'messages');
    const messageData = {
      userId,
      userName,
      userPhoto: userPhoto || null,
      type: fileType,
      fileURL: downloadURL,
      fileName: file.name,
      fileSize: file.size,
      text: null,
      replyTo: null,
      reactions: {},
      edited: false,
      deleted: false,
      createdAt: serverTimestamp(),
      readBy: [userId]
    };

    const docRef = await addDoc(messagesRef, messageData);
    console.log('✅ Archivo enviado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error subiendo archivo:', error);
    throw error;
  }
};

export const uploadAudio = async (audioBlob, userId, userName, userPhoto, duration) => {
  try {
    console.log('🎤 Iniciando subida de audio...');
    console.log('📊 Audio blob size:', audioBlob.size, 'bytes');
    console.log('⏱️ Duración:', duration, 'segundos');

    const timestamp = Date.now();
    const fileName = `audio_${timestamp}.webm`;
    const audioRef = storageRef(storage, `chat/${GROUP_ID}/audios/${fileName}`);

    console.log('📤 Subiendo a Firebase Storage...');
    await uploadBytes(audioRef, audioBlob, {
      contentType: 'audio/webm'
    });
    
    console.log('🔗 Obteniendo URL de descarga...');
    const downloadURL = await getDownloadURL(audioRef);

    const messagesRef = collection(db, CHAT_COLLECTION, GROUP_ID, 'messages');
    const messageData = {
      userId,
      userName,
      userPhoto: userPhoto || null,
      type: 'audio',
      fileURL: downloadURL,
      fileName: fileName,
      audioDuration: duration,
      text: null,
      replyTo: null,
      reactions: {},
      edited: false,
      deleted: false,
      createdAt: serverTimestamp(),
      readBy: [userId]
    };

    console.log('💾 Guardando mensaje en Firestore...');
    const docRef = await addDoc(messagesRef, messageData);
    console.log('✅ Audio enviado correctamente:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error subiendo audio:', error);
    console.error('Detalles:', error.message);
    throw error;
  }
};

export const editMessage = async (messageId, newText) => {
  try {
    const messageRef = doc(db, CHAT_COLLECTION, GROUP_ID, 'messages', messageId);
    await updateDoc(messageRef, {
      text: newText,
      edited: true,
      editedAt: serverTimestamp()
    });
    console.log('✅ Mensaje editado:', messageId);
  } catch (error) {
    console.error('❌ Error editando mensaje:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId) => {
  try {
    const messageRef = doc(db, CHAT_COLLECTION, GROUP_ID, 'messages', messageId);
    await updateDoc(messageRef, {
      deleted: true,
      deletedAt: serverTimestamp()
    });
    console.log('✅ Mensaje eliminado:', messageId);
  } catch (error) {
    console.error('❌ Error eliminando mensaje:', error);
    throw error;
  }
};

export const reactToMessage = async (messageId, userId, emoji) => {
  try {
    const messageRef = doc(db, CHAT_COLLECTION, GROUP_ID, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (messageSnap.exists()) {
      const reactions = messageSnap.data().reactions || {};
      
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      
      const userIndex = reactions[emoji].indexOf(userId);
      if (userIndex === -1) {
        reactions[emoji].push(userId);
      } else {
        reactions[emoji].splice(userIndex, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      await updateDoc(messageRef, { reactions });
    }
  } catch (error) {
    console.error('❌ Error reaccionando:', error);
    throw error;
  }
};

export const markAsRead = async (userId) => {
  try {
    const messagesRef = collection(db, CHAT_COLLECTION, GROUP_ID, 'messages');
    const q = query(messagesRef, where('readBy', 'not-in', [[userId]]));
    
    const snapshot = await getDocs(q);
    
    const updates = snapshot.docs.map(doc => {
      const messageRef = doc.ref;
      const currentReadBy = doc.data().readBy || [];
      if (!currentReadBy.includes(userId)) {
        return updateDoc(messageRef, {
          readBy: [...currentReadBy, userId]
        });
      }
      return Promise.resolve();
    });

    await Promise.all(updates);
  } catch (error) {
    console.error('❌ Error marcando como leído:', error);
  }
};

// Notificar que el usuario está escribiendo
export const notifyTyping = async (userId, isTyping = true) => {
  try {
    const typingRef = rtdbRef(rtdb, `typing/${userId}/general`);
    
    if (isTyping) {
      await set(typingRef, {
        isTyping: true,
        timestamp: Date.now()
      });
    } else {
      await remove(typingRef);
    }
  } catch (error) {
    console.error('❌ Error notificando typing:', error);
  }
};