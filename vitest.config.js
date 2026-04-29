// vitest.config.js
//
// Config raíz de Vitest para la suite de tests de Inmobiliaria RYB.
// Coloca este archivo en la RAÍZ del proyecto (donde está package.json).

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
 
export default defineConfig({
  plugins: [react()],          // ← esto es lo que faltaba: transforma JSX correctamente
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    // Firestore rules tests share one emulator/project. Running files in parallel
    // makes env.clearFirestore() erase data from other tests mid-assertion.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
  },
});