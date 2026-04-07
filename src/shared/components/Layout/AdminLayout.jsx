import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FaBars } from "react-icons/fa";

const AdminLayout = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);

  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  useEffect(() => {
    const onResize = () => {
      const large = window.innerWidth >= 1024;
      setIsDesktop(large);
      if (large) setSidebarOpen(false);
      if (!large) setSidebarHover(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const openHover = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enterTimerRef.current = setTimeout(() => setSidebarHover(true), 120);
  };

  const closeHover = () => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => setSidebarHover(false), 80);
  };

  return (
    /* bg usa variable semántica — cambia automáticamente con el tema */
    <div
      className="min-h-[100dvh] w-full overflow-x-hidden relative"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
    >
      {/* DESKTOP hover zone */}
      {isDesktop && (
        <div
          className="hidden lg:block fixed inset-y-0 left-0 z-40 w-20"
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
        >
          <Sidebar
            isOpen={true}
            onClose={() => {}}
            collapsed={true}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            isHoverExpanded={sidebarHover}
            onRequestCloseOverlay={() => setSidebarHover(false)}
          />
        </div>
      )}

      {/* MÓVIL */}
      {!isDesktop && (
        <div className="lg:hidden">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={false}
            onToggleCollapse={() => {}}
          />
        </div>
      )}

      {/* CONTENIDO */}
      <div className="min-h-[100dvh] flex flex-col min-w-0 lg:pl-20">
        {/* Topbar móvil — usa variable semántica */}
        <div
          className="lg:hidden h-16 backdrop-blur flex items-center px-4 shrink-0 gap-3 border-b"
          style={{
            backgroundColor: "var(--color-topbar-bg)",
            borderColor: "var(--color-topbar-border)",
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Abrir menú"
          >
            <FaBars size={20} />
          </button>
          <div className="flex-1 min-w-0 flex items-center">
            <img
              src="/logo.jpg.png"
              alt="Rincón Bedoya & Asociados"
              className="h-10 w-auto object-contain max-w-[240px]"
              draggable={false}
            />
          </div>
        </div>

        {/* Área scrollable */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <Outlet
              context={{
                openSidebar: () => setSidebarOpen(true),
                sidebarCollapsed,
                setSidebarCollapsed,
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
