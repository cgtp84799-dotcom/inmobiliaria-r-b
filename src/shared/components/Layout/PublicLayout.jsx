import { Outlet, Link } from 'react-router-dom';
import { FaUserLock } from 'react-icons/fa';

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-dark text-light">
      {/* Header público */}
      <header className="border-b border-slate-800 bg-dark/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Logo y nombre */}
          <Link to="/" className="flex items-center gap-4 group">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-light leading-tight">
                Rincón Bedoya & Asociados
              </h1>
              <p className="text-xs text-primary-300 font-medium">
                Inmobiliaria con respaldo jurídico
              </p>
            </div>
          </Link>

          {/* Navegación */}
          <nav className="flex items-center gap-6">
            <Link 
              to="/" 
              className="text-sm font-medium text-light hover:text-primary transition"
            >
              Inicio
            </Link>
            <Link 
              to="/propiedades" 
              className="text-sm font-medium text-light hover:text-primary transition"
            >
              Propiedades
            </Link>
            <Link 
              to="/contacto" 
              className="text-sm font-medium text-light hover:text-primary transition"
            >
              Contacto
            </Link>
            
            {/* Acceso discreto para agentes - solo ícono */}
            <Link 
              to="/acceso" 
              className="text-muted-soft hover:text-primary transition p-2 rounded-lg hover:bg-slate-800"
              title="Acceso para agentes autorizados"
            >
              <FaUserLock className="text-lg" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Contenido de cada página pública */}
      <main>
        <Outlet />
      </main>

      {/* Footer público */}
      <footer className="border-t border-slate-800 bg-dark/95 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted-soft text-sm">
            &copy; {new Date().getFullYear()} Rincón Bedoya & Asociados. Todos los derechos reservados.
          </p>
          <p className="text-muted-soft text-xs mt-2">
            Anserma, Caldas - Colombia
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;