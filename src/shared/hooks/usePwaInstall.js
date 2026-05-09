// src/shared/hooks/usePwaInstall.js
//
// Hook que expone:
//   · canInstall:  true si el navegador ofrece la instalación y NO está ya instalada
//   · promptInstall(): función para mostrar el diálogo nativo de instalación
//
// Uso típico en cualquier componente:
//
//   const { canInstall, promptInstall } = usePwaInstall();
//   return canInstall ? <button onClick={promptInstall}>Instalar app</button> : null;
//
// Compatible con Chrome, Edge, Samsung Internet, Opera (escuchan beforeinstallprompt).

import { useState, useEffect, useCallback } from 'react';

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Escucha el evento beforeinstallprompt
    const handleBeforeInstall = (e) => {
      // Evitar que el navegador muestre el mini-infobar automático
      e.preventDefault();
      // Guardar el evento para usarlo después
      setInstallPrompt(e);
    };

    // Escucha el evento appinstalled para saber si ya se instaló
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('[PWA] Aplicación instalada correctamente.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    // Mostrar el diálogo nativo
    await installPrompt.prompt();
    // Esperar la respuesta del usuario
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] Resultado de instalación: ${outcome}`);
    // Limpiar la referencia para que no se pueda llamar dos veces
    setInstallPrompt(null);
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    promptInstall,
  };
}

export default usePwaInstall;