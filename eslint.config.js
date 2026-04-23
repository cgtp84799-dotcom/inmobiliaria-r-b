import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // ── Carpetas excluidas del lint del frontend ──────────────────
  // functions/ usa CommonJS (require) — tiene su propio entorno Node.
  // dist/ es el build compilado — nunca se lintea.
  globalIgnores(['dist', 'functions']),

  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Variables sin usar → error (excepto constantes UPPER_CASE)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],

      // Dependencias faltantes en hooks → advertencia (no bloquea el build)
      // Los casos reales de bug se detectan en runtime con StrictMode activo.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
])