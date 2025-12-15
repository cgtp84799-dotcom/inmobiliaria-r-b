import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../../../modules/notifications/components/NotificationBell';

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-dark text-light">
      {/* Sidebar fija */}
      <Sidebar />

      {/* Área principal */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Header superior del panel */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-dark/95 backdrop-blur-sm relative z-40">
          <div>
            <h1 className="text-lg font-semibold text-light">Panel interno</h1>
            <p className="text-muted-soft text-xs">
              Gestión inmobiliaria y jurídica
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Campana de notificaciones AQUÍ */}
            <NotificationBell />
          </div>
        </header>

        {/* Contenido de cada página */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;