import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaWhatsapp,
  FaSpinner,
  FaArchive,
  FaUserPlus,
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import toast from 'react-hot-toast';

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [contactToArchive, setContactToArchive] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'contacts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      setContacts(contactsData);
      setLoading(false);
    }, (error) => {
      console.error('Error cargando consultas:', error);
      toast.error('Error al cargar las consultas');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsContacted = async (contactId) => {
    setProcessingId(contactId);
    try {
      await updateDoc(doc(db, 'contacts', contactId), {
        status: 'contacted',
        updatedAt: new Date()
      });
      toast.success('Marcado como contactado');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast.error('Error al actualizar');
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ FUNCIÓN CORREGIDA - Usar nombres de campos compatibles
  const closeAndCreateClient = async (contact) => {
    setProcessingId(contact.id);
    console.log('📋 Creando cliente desde consulta:', contact);
    
    try {
      // 1. Crear el cliente en el CRM con nombres de campos correctos
      const clientData = {
        nombre: contact.name,  // ✅ nombre, no name
        email: contact.email,
        telefono: contact.phone,  // ✅ telefono, no phone
        tipoCliente: 'Lead',  // ✅ tipoCliente, no type
        estado: 'Activo',
        presupuesto: '',
        tipoPropiedad: '',
        ubicacionInteres: '',
        notas: contact.message || 'Contacto desde formulario web',
        propiedadVinculada: contact.propertyId || '',
        fechaRegistro: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdFrom: 'contact_inquiry',
        source: 'web_contact_form',
        interestedProperty: contact.propertyId || null,
        interestedPropertyTitle: contact.propertyTitle || null,
      };

      // Crear cliente
      const clientRef = doc(collection(db, 'clients'));
      await setDoc(clientRef, clientData);
      console.log('✅ Cliente creado con ID:', clientRef.id);

      // 2. Marcar la consulta como cerrada
      await updateDoc(doc(db, 'contacts', contact.id), {
        status: 'closed',
        closedAt: new Date(),
        convertedToClientId: clientRef.id,
        updatedAt: new Date()
      });

      toast.success('✅ Consulta cerrada y cliente creado en el CRM');
    } catch (error) {
      console.error('❌ Error cerrando consulta:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openArchiveModal = (contact) => {
    setContactToArchive(contact);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!contactToArchive) return;

    setProcessingId(contactToArchive.id);
    try {
      await deleteDoc(doc(db, 'contacts', contactToArchive.id));
      
      toast.success('✅ Consulta archivada correctamente');
      setShowArchiveModal(false);
      setContactToArchive(null);
    } catch (error) {
      console.error('Error archivando consulta:', error);
      toast.error('❌ Error al archivar la consulta');
    } finally {
      setProcessingId(null);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setContactToArchive(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: FaClock,
        text: 'Pendiente',
        class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      },
      contacted: {
        icon: FaCheckCircle,
        text: 'Contactado',
        class: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      },
      closed: {
        icon: FaCheckCircle,
        text: 'Cerrado',
        class: 'bg-green-500/20 text-green-400 border-green-500/30'
      }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${badge.class}`}>
        <Icon size={12} />
        {badge.text}
      </span>
    );
  };

  const filteredContacts = contacts.filter(contact => contact.status === filter);

  const formatDate = (date) => {
    if (!date) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-primary text-5xl" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light mb-2">Consultas de Clientes</h1>
        <p className="text-slate-400">
          Gestiona las consultas recibidas desde el sitio web
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
            filter === 'pending'
              ? 'bg-yellow-500 text-slate-900 shadow-lg'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <FaClock className="inline mr-2" />
          Pendientes ({contacts.filter(c => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('contacted')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
            filter === 'contacted'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <FaCheckCircle className="inline mr-2" />
          Contactados ({contacts.filter(c => c.status === 'contacted').length})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
            filter === 'closed'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <FaArchive className="inline mr-2" />
          Historial ({contacts.filter(c => c.status === 'closed').length})
        </button>
      </div>

      {/* Lista de contactos */}
      {filteredContacts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <FaEnvelope className="text-slate-600 text-5xl mx-auto mb-4" />
          <p className="text-slate-400 text-lg">
            No hay consultas {filter === 'pending' ? 'pendientes' : filter === 'contacted' ? 'contactadas' : 'en el historial'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredContacts.map((contact) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-primary/50 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Info principal */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-light mb-1 flex items-center gap-2">
                        <FaUser className="text-primary" size={18} />
                        {contact.name}
                      </h3>
                      {contact.propertyTitle && (
                        <p className="text-slate-400 text-sm">
                          Interesado en: <span className="text-primary font-semibold">{contact.propertyTitle}</span>
                        </p>
                      )}
                    </div>
                    {getStatusBadge(contact.status)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-slate-300 flex items-center gap-2">
                      <FaEnvelope className="text-primary" size={14} />
                      <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                        {contact.email}
                      </a>
                    </p>
                    <p className="text-slate-300 flex items-center gap-2">
                      <FaPhone className="text-primary" size={14} />
                      <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">
                        {contact.phone}
                      </a>
                    </p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <FaCalendarAlt className="text-slate-500" size={14} />
                      {formatDate(contact.createdAt)}
                    </p>
                  </div>

                  {contact.message && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {contact.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex lg:flex-col gap-2">
                  <a
                    href={`https://wa.me/57${contact.phone.replace(/\D/g, '')}?text=Hola ${contact.name}, te contactamos desde Rincón Bedoya & Asociados`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 lg:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <FaWhatsapp />
                    WhatsApp
                  </a>

                  {contact.status === 'pending' && (
                    <button
                      onClick={() => markAsContacted(contact.id)}
                      disabled={processingId === contact.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {processingId === contact.id ? <FaSpinner className="animate-spin mx-auto" /> : 'Marcar contactado'}
                    </button>
                  )}

                  {contact.status === 'contacted' && (
                    <button
                      onClick={() => closeAndCreateClient(contact)}
                      disabled={processingId === contact.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === contact.id ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FaUserPlus />
                          Cerrar y crear cliente
                        </>
                      )}
                    </button>
                  )}

                  {contact.status === 'closed' && (
                    <button
                      onClick={() => openArchiveModal(contact)}
                      disabled={processingId === contact.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FaArchive />
                      Archivar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      <AnimatePresence>
        {showArchiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={cancelArchive}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-500 text-3xl" />
              </div>

              <h3 className="text-2xl font-bold text-light text-center mb-2">
                ¿Archivar consulta?
              </h3>

              <p className="text-slate-400 text-center mb-6">
                Esta acción eliminará permanentemente la consulta de <span className="text-primary font-semibold">{contactToArchive?.name}</span>. 
                No se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelArchive}
                  disabled={processingId === contactToArchive?.id}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-light rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmArchive}
                  disabled={processingId === contactToArchive?.id}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === contactToArchive?.id ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <FaArchive />
                      Archivar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactsPage;