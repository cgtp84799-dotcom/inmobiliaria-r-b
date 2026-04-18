// src/modules/clients/hooks/useWelcome.js
//
// FIX CRÍTICO: El useEffect que reseteaba `dismissed` cuando `onboardingDone`
// cambiaba era el causante del bug donde el modal desaparecía y volvía a aparecer.
//
// El flujo anterior era:
//   1. Portal carga → onboardingDone = true (loading)
//   2. Perfil llega de Firestore → onboardingDone = false → useEffect resetea dismissed=false → modal aparece ✓
//   3. Usuario cierra → dismissWelcome() → dismissed=true → modal oculto ✓
//   4. finishOnboarding() actualiza Firestore → snapshot llega → clientData cambia
//      → onboardingDone pasa de false a true → useEffect detecta cambio → setDismissed(false) → BUG 💥
//
// SOLUCIÓN: Eliminar completamente el useEffect. El dismissed solo se puede resetear
// cuando cambia el EMAIL del usuario (nueva sesión con otro usuario), no cuando
// cambia onboardingDone dentro de la misma sesión.

import { useState, useEffect, useRef } from 'react';

/**
 * @param {boolean|undefined|null} onboardingDone - valor de clients/{id}.onboardingDone
 * @param {boolean} loading - si useClientPortal aún está cargando
 * @returns {{ showWelcome: boolean, dismiss: () => void }}
 */
export function useWelcome(onboardingDone, loading) {
  // dismissed solo se resetea cuando cambia el usuario (email), NO cuando onboardingDone cambia
  const [dismissed, setDismissed] = useState(false);

  // Mostrar solo cuando:
  // 1. No está cargando
  // 2. onboardingDone está explícitamente en false (no null/undefined)
  // 3. El usuario no lo ha cerrado en esta sesión
  const showWelcome = !loading
    && onboardingDone === false
    && !dismissed;

  const dismiss = () => setDismissed(true);

  return { showWelcome, dismiss };
}