import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-dark text-light flex flex-col">
      <Navbar />

      {/* Contenido */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-dark/95 py-8 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-muted-soft text-sm">
            &copy; {new Date().getFullYear()} Rincón Bedoya & Asociados. Todos los derechos reservados.
          </p>
          <p className="text-muted-soft text-xs mt-2">Anserma, Caldas - Colombia</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;