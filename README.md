# Inmobiliaria Rincón Bedoya y Asociados

Plataforma inmobiliaria con respaldo jurídico para la gestión integral de propiedades en Colombia: catálogo público SEO-first, portal de clientes, panel administrativo, contratos, pagos programados, notificaciones push y videoconferencias.

**Stack:** React 19 · Vite 7 · Firebase 12 (Auth, Firestore, Storage, Functions v2, Realtime DB, FCM, App Check) · Tailwind 3 · Cloud Functions (Node 22).

**Producción:** https://inmobiliaria-ryb-y-asociados.com

---

## ✅ Requisitos

- Node.js **20 o superior** (el CI corre en 20, las Functions en 22).
- npm **10+**.
- Cuenta de Firebase con un proyecto creado y los siguientes servicios activos: Authentication, Firestore, Storage, Realtime Database, Cloud Functions, Cloud Messaging, App Check (reCAPTCHA v3).
- Firebase CLI: `npm install -g firebase-tools`.

---

## 🚀 Setup inicial (primera vez)

```bash
# 1. Clonar el repo
git clone https://github.com/cgtp84799-dotcom/inmobiliaria-r-b.git
cd inmobiliaria-r-b

# 2. Instalar dependencias del cliente
npm install

# 3. Instalar dependencias de las Cloud Functions
cd functions && npm install && cd ..

# 4. Crear el archivo de variables de entorno
cp .env.example .env.local
# Editar .env.local con los valores reales del proyecto Firebase

# 5. Autenticarse con Firebase CLI
firebase login
firebase use inmobiliaria-ryb-y-asociados

# 6. Levantar en desarrollo
npm run dev
```

La aplicación quedará en `http://localhost:5173`.

---

## 🔧 Variables de entorno

Todas viven en `.env.local` (nunca commitear). Ver `.env.example` para la lista completa.

**Imprescindibles para arrancar:**

| Variable | Dónde conseguirla |
|---|---|
| `VITE_FIREBASE_API_KEY` y demás `VITE_FIREBASE_*` | Firebase Console → Configuración del proyecto → Tus apps (Web) |
| `VITE_FIREBASE_APP_CHECK_KEY` | Firebase Console → App Check → Web apps → reCAPTCHA v3 site key |
| `VITE_VAPID_KEY` | Firebase Console → Cloud Messaging → Web Push certificates |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console (restringir por HTTP referrer al dominio) |
| `VITE_WA_NUMBER` | Número WhatsApp Business, formato internacional sin `+` |

---

## 📦 Scripts disponibles

```bash
npm run dev               # Vite dev server en http://localhost:5173
npm run build             # Build de producción → dist/
npm run preview           # Previsualizar el build
npm run lint              # ESLint
npm run lint:fix          # ESLint + autofix
npm run deploy            # Build + deploy de Hosting (target: production)
npm run deploy:functions  # Deploy solo de Cloud Functions
npm run deploy:rules      # Deploy solo de Firestore + Storage rules
npm test                  # Vitest (sin coverage)
npm run test:watch        # Vitest en modo watch
```

Desde `functions/` también hay scripts propios (`npm run serve`, `npm run deploy`, etc.).

---

## 🏗 Arquitectura del proyecto

```
inmobiliaria-r-b/
├── .github/workflows/     # CI/CD (lint + build + deploy)
├── docs/                  # Auditoría, planes, módulo agents (histórico)
├── functions/             # Cloud Functions v2 (Node 22)
│   ├── src/
│   │   ├── emails/        # Builders de plantillas de email
│   │   ├── prerender.js   # SSR mínimo para crawlers
│   │   ├── sitemap.js     # Sitemap dinámico (XML)
│   │   ├── site.config.js # SITE_URL, contactos, logos (CJS)
│   │   ├── utils/         # rateLimiter, helpers
│   │   └── visitEmails.js
│   └── index.js           # Entry point — exporta todas las funciones
├── public/                # Assets estáticos + SW + analytics.js + schema-ld.json
├── src/
│   ├── core/
│   │   ├── config/
│   │   │   ├── firebase.config.js
│   │   │   ├── routes.config.js
│   │   │   └── site.config.js  # SITE_URL, contactos, logos (ESM)
│   │   ├── contexts/      # AuthContext, ThemeContext
│   │   └── services/      # notificationService
│   ├── modules/           # Feature-based (agents, auth, clients, contracts, ...)
│   │   └── <feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       ├── services/
│   │       └── types/
│   ├── shared/            # Layouts, UI, SEO, utils compartidos
│   ├── App.jsx            # Router principal
│   └── main.jsx           # Entry point de React
├── tests/                 # Tests (Firestore rules, validators, frontend)
├── firebase.json          # Hosting, Functions, headers, redirects, CSP
├── firestore.rules        # Reglas de seguridad de Firestore
├── firestore.indexes.json # Índices compuestos para queries
├── storage.rules          # Reglas de seguridad de Cloud Storage
├── MIGRATION.md           # Cambios aplicados en la auditoría 2026-05
└── vite.config.js         # Build config (chunks, terser, etc.)
```

### Configuración del sitio centralizada

Cualquier referencia al dominio, número de WhatsApp, email de contacto o ruta de logo se hace mediante:

- **Cliente:** `import { SITE_URL, WA_NUMBER, LOGO_DARK, LOGO_LIGHT } from '@/core/config/site.config'`
- **Cloud Functions:** `const { SITE_URL, ... } = require('./site.config')`

No volver a poner literales `https://inmobiliaria-ryb-y-asociados.com` en archivos nuevos. Cambiar de dominio = cambiar **un solo archivo**.

### Sistema de roles

| Rol | Acceso | Colección |
|---|---|---|
| `admin`  | Panel interno completo + gestión de usuarios | `users/{email}` |
| `member` | Panel interno operativo (sin usuarios)       | `users/{email}` |
| `viewer` | Portal de clientes — solo sus propios datos   | `users/{email}` |

**Nota técnica:** `users` usa el email como ID de documento. Eso está identificado como deuda técnica (ver `docs/AUDIT.md`); la migración a `users/{uid}` está pendiente.

### Status de propiedad (enum canónico)

Definido en `src/modules/properties/types/property.types.js`:

| Valor | Significado |
|---|---|
| `published` | Visible en el catálogo público (default operativo). |
| `reserved`  | Visible pero marcada como reservada. |
| `sold`      | Vendida — no se muestra en catálogo público. |
| `rented`    | Arrendada — no se muestra en catálogo público. |
| `draft`     | Borrador — solo visible en panel admin. |
| `inactive`  | Inactiva — solo visible en panel admin. |

Los datos legacy en español (`disponible`, `reservada`, `vendida`, `arrendada`) se aceptan en lectura mediante `normalizePropertyStatus()` y `isPublicStatus()`. Toda escritura nueva debe usar el enum en inglés.

**Las Firestore Rules solo permiten lectura pública si `status == 'published'`.** Si necesitas exponer otro estado al público, ajustar también las rules.

---

## 🛡 Seguridad

### Capas activas

1. **Firestore Rules** (`firestore.rules`): modelo RBAC + validación de campos en creación/update + whitelist para colecciones públicas (contactos, solicitudes de visita, solicitudes de acceso). Chat aislado por array de `participants`.
2. **Storage Rules** (`storage.rules`): CRUD restringido por rol + validación de tipo MIME + límites de tamaño (10 MB imágenes / 25 MB documentos).
3. **App Check** (reCAPTCHA v3): bloquea tráfico de bots y apps no autorizadas a Firestore/Storage. El debug token solo se activa cuando el hostname es claramente local.
4. **Content Security Policy** estricta en `firebase.json` — sin `unsafe-inline` en scripts.
5. **CORS whitelist** explícita en Cloud Functions (no se acepta `*`).
6. **Cloud Functions** usan `verifyIdToken(token, checkRevoked=true)` para detectar sesiones revocadas en tiempo real.

### Antes de un deploy

```bash
# Auditar reglas con emulador
firebase emulators:start --only firestore,storage,auth

# Tests
npm test

# Deploy seguro en orden
npm run deploy:rules      # 1. Reglas primero
npm run deploy:functions  # 2. Functions
npm run deploy            # 3. Frontend al final
```

---

## 🤖 SEO y prerender

La SPA se sirve tal cual a humanos, pero los crawlers (Googlebot, Bingbot, FB, WhatsApp, etc.) son detectados por User-Agent en la Cloud Function `serveApp` y reciben HTML pre-renderizado con meta tags, Open Graph y JSON-LD completos. Ver `functions/src/prerender.js`.

Sitemaps dinámicos servidos por `functions/src/sitemap.js` en:
- `/sitemap.xml`
- `/sitemap-properties.xml`
- `/sitemap-cities.xml`
- `/sitemap-static.xml`

---

## 🧪 Testing

Tests con Vitest + `@firebase/rules-unit-testing` para reglas. Distribuidos en:

- `tests/firestore/` — Reglas de Firestore (clients, contracts, visits, mail, ...).
- `tests/functions/` — HTTP handlers y validators.
- `tests/frontend/` — Componentes y hooks (AuthContext, ProtectedRoute, ...).
- `tests/utils/` — formatCurrency, formatDate.
- `tests/validators/` — validators compartidos.

```bash
npm test                  # Todos los tests
npm run test:rules        # Solo Firestore rules
npm run test:fast         # Validators + functions + frontend (sin emulador)
```

Cobertura priorizada: rules y validators. **Pendiente:** tests de servicios críticos (`contract.service.js`, payment triggers, `property.service.js`).

---

## 🚢 Deploy

CI/CD vía GitHub Actions (`.github/workflows/deploy.yml`):

- **Pull Request → `main`:** corre lint + build.
- **Push a `main`:** corre lint + build + deploy a Hosting producción.

**Secrets requeridos en el repo** (ver cabecera de `deploy.yml` para la lista completa):
- `FIREBASE_SERVICE_ACCOUNT` (JSON service account)
- Todas las variables `VITE_*` que necesita el build.

---

## 📚 Documentación adicional

- `docs/AUDIT.md` — Auditoría de seguridad y calidad (vivo).
- `docs/AUDIT-PLAN.md` — Plan de mitigación.
- `docs/AGENTS_MODULE.md` — Documentación del módulo de agentes.
- `docs/README-FIXES-V2.md` — Bitácora de fixes de la v2.
- `docs/README-TESTS.md` — Guía detallada de tests.
- `MIGRATION.md` — Cambios de la auditoría 2026-05 y cómo aplicarlos.

---

## 📄 Licencia y autoría

Software propietario desarrollado por **Mateo Carvajal Tamayo** para uso exclusivo de **Andrés Medardo Rincón Bedoya** (NIT 1087985594-7, Matrícula Mercantil 238639 — Cámara de Comercio de Manizales por Caldas). Ver `LICENSE` para los términos completos.

© 2025 Mateo Carvajal Tamayo. Todos los derechos reservados.
