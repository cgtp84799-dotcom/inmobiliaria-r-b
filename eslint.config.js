// ═══════════════════════════════════════════════════════════════════════════
//  ESLint Flat Config — ESLint 9.x
//
//  Filosofía:
//    - Errores de sintaxis / bugs reales → `error`
//    - Antipatrones estilísticos (incluso los nuevos y estrictos de
//      react-hooks v7) → `warning`, para no bloquear iteración.
//
//  Reglas de react-hooks v7 usadas: solo las que existen realmente en
//  esta versión del plugin (verificadas contra node_modules).
// ═══════════════════════════════════════════════════════════════════════════

import js           from '@eslint/js';
import globals      from 'globals';
import reactHooks   from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y      from 'eslint-plugin-jsx-a11y';

export default [
  // ── Ignores globales ───────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'public/**',
      '**/*.min.js',
      'node_modules/**',
      'functions/node_modules/**',
      '.firebase/**',
    ],
  },

  // ── Recomendaciones base JS ────────────────────────────────────────────
  js.configs.recommended,

  // ── Cliente React ───────────────────────────────────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      'react-hooks':   reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y':      jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'module',
      globals:     { ...globals.browser, ...globals.serviceworker },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // ── React Hooks — críticas (error) ───────────────────────────────────
      'react-hooks/rules-of-hooks':  'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── React Hooks v7 — reglas estrictas nuevas (warning) ──────────────
      // Flagean patrones normales que no son bugs reales en la mayoría
      // de los casos. Cuando se refactorice progresivamente, se pueden
      // subir a 'error'.
      'react-hooks/set-state-in-effect':         'warn',
      'react-hooks/set-state-in-render':         'warn',
      'react-hooks/static-components':           'warn',
      'react-hooks/immutability':                'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity':                      'warn',
      'react-hooks/refs':                        'warn',
      'react-hooks/unsupported-syntax':          'warn',
      'react-hooks/component-hook-factories':    'warn',
      'react-hooks/error-boundaries':            'warn',
      'react-hooks/no-deriving-state-in-effects': 'warn',
      'react-hooks/capitalized-calls':           'warn',

      // ── React Refresh ────────────────────────────────────────────────────
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── Accesibilidad — solo warnings ────────────────────────────────────
      'jsx-a11y/alt-text':                       'warn',
      'jsx-a11y/anchor-is-valid':                'warn',
      'jsx-a11y/click-events-have-key-events':   'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control':   'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-autofocus':                   'off',
      'jsx-a11y/media-has-caption':              'off',

      // ── Reglas generales ─────────────────────────────────────────────────
      'no-unused-vars': ['warn', {
        argsIgnorePattern:         '^_',
        varsIgnorePattern:         '^_|^[A-Z]',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty':     ['warn', { allowEmptyCatch: true }],
      'no-console':   ['warn', { allow: ['warn', 'error'] }],
      'no-debugger':  'error',
      'no-alert':     'warn',
      'no-var':       'error',
      'prefer-const': 'warn',
      'eqeqeq':       ['error', 'smart'],
      'no-irregular-whitespace': ['error', {
        skipStrings:   true,
        skipTemplates: true,
        skipComments:  true,
      }],
    },
  },

  // ── Cloud Functions (CommonJS + Node) ──────────────────────────────────
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'commonjs',
      globals:     { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console':     'off',
      'no-empty':       ['warn', { allowEmptyCatch: true }],
    },
  },

  // ── Scripts de migración / utilidades ──────────────────────────────────
  {
    files: ['src/scripts/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },

  // ── Archivos de config raíz (Node) ─────────────────────────────────────
  {
    files: ['*.config.{js,mjs,cjs}', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'module',
      globals:     { ...globals.node },
    },
  },

  // ── Tests (Vitest + Node) ────────────────────────────────────────────────
  {
    files: ['tests/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        // Vitest globals usados vía import explícito — solo los más comunes
        describe:   'readonly',
        it:         'readonly',
        test:       'readonly',
        expect:     'readonly',
        beforeAll:  'readonly',
        afterAll:   'readonly',
        beforeEach: 'readonly',
        afterEach:  'readonly',
        vi:         'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern:         '^_',
        varsIgnorePattern:         '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-console': 'off',
    },
  },
];