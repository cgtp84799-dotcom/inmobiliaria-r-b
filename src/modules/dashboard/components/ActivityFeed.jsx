import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaBuilding, FaUser, FaFileContract } from 'react-icons/fa';

const ActivityFeed = ({ activities }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'property':
        return FaBuilding;
      case 'client':
        return FaUser;
      case 'contract':
        return FaFileContract;
      default:
        return FaBuilding;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'property':
        return 'text-primary';
      case 'client':
        return 'text-blue-400';
      case 'contract':
        return 'text-green-400';
      default:
        return 'text-light';
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = getIcon(activity.type);
        const color = getColor(activity.type);
        
        return (
          <div key={index} className="flex items-start space-x-3 pb-4 border-b border-primary/10 last:border-0">
            <div className={`p-2 rounded-lg bg-black/60 ${color}`}>
              <Icon />
            </div>
            
            <div className="flex-1">
              <p className="text-light font-medium text-sm">{activity.action}</p>
              <p className="text-light/70 text-xs">{activity.title}</p>
              {activity.timestamp && (
                <p className="text-light/50 text-xs mt-1">
                  {formatDistanceToNow(activity.timestamp.toDate(), {
                    addSuffix: true,
                    locale: es
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;