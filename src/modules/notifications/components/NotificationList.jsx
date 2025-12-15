import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FaFileAlt, 
  FaComments, 
  FaUser, 
  FaExclamationCircle,
  FaTrash 
} from 'react-icons/fa';
import { notificationService } from '../services/notification.service';

const NotificationList = ({ notifications, onClose }) => {
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'document_expiring':
        return FaFileAlt;
      case 'new_message':
        return FaComments;
      case 'new_inquiry':
        return FaUser;
      default:
        return FaExclamationCircle;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'document_expiring':
        return 'text-yellow-400';
      case 'new_message':
        return 'text-blue-400';
      case 'new_inquiry':
        return 'text-green-400';
      default:
        return 'text-primary';
    }
  };

  const handleClick = async (notification) => {
    // Marcar como leída
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
    }

    // Navegar a la URL de acción
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    await notificationService.deleteNotification(notificationId);
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-light/50">No tienes notificaciones</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {notifications.map((notification) => {
        const Icon = getIcon(notification.type);
        const color = getColor(notification.type);

        return (
          <div
            key={notification.id}
            onClick={() => handleClick(notification)}
            className={`p-4 border-b border-primary/10 hover:bg-white/5 cursor-pointer transition ${
              !notification.read ? 'bg-primary/5' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg bg-black/60 ${color} flex-shrink-0`}>
                <Icon />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-light font-semibold text-sm">
                      {notification.title}
                    </p>
                    <p className="text-light/70 text-xs mt-1">
                      {notification.message}
                    </p>
                    {notification.createdAt && (
                      <p className="text-light/50 text-xs mt-2">
                        {formatDistanceToNow(notification.createdAt.toDate(), {
                          addSuffix: true,
                          locale: es
                        })}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="ml-2 p-1 text-light/50 hover:text-red-400 transition"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>

                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationList;