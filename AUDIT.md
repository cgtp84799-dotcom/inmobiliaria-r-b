# 🔍 Auditoría de Seguridad y Calidad — Estado

Documento vivo. Registra hallazgos, correcciones aplicadas y pendientes.

**Fecha de auditoría:** Abril 2026
**Líneas auditadas:** ≈ 44,700 LOC / 156 archivos fuente
**Riesgo global inicial:** ALTO
**Riesgo global post-corrección:** MEDIO-BAJO (quedan items de refactor, no de seguridad crítica)

---

## ✅ Correcciones aplicadas en esta iteración

### 🔴 Críticas (seguridad / bloqueantes)

| # | Archivo | Problema original | Corrección |
|---|---------|-------------------|------------|
| 1 | `storage.rules` | **No existía** aunque estaba referenciado en `firebase.json`. Storage quedaba con reglas por defecto. | Creado con modelo RBAC + validación MIME + límites de tamaño. |
| 2 | `firestore.rules` | Chat sin restricción por participantes: cualquier `member` leía cualquier conversación. | Añadido array `participants` + validación por `get()` en subcolección `messages`. |
| 3 | `firestore.rules` | `/mail` permitía a viewers crear cualquier email sin validar `from`/`template`. | Añadida función `isSafeClientMail()` con whitelist de campos y plantilla obligatoria. |
| 4 | `firestore.rules` | `hasRole()` tronaba si `role` no era string. | Validación explícita de tipo antes del `in`. |
| 5 | `functions/index.js` | `verifyIdToken` sin `checkRevoked` → tokens de cuentas deshabilitadas seguían siendo válidos ~1h. | Segundo parámetro `true` + try/catch con 401 claro. |
| 6 | `functions/index.js` | `createUserByAdmin` no validaba rol del usuario a crear → posible escalación a roles arbitrarios. | Whitelist `VALID_ROLES` + `VALID_STATUSES` + validación de email y password. |
| 7 | `functions/index.js` | `deleteUserComplete` permitía auto-eliminación → admin podía quedarse sin acceso. | Check `userId === callerEmail` → 400. |
| 8 | `src/core/config/firebase.config.js` | `FIREBASE_APPCHECK_DEBUG_TOKEN = true` se activaba solo con `DEV`, rompiendo App Check en previews públicos. | Ahora exige `DEV && hostname local` (localhost/127.0.0.1/*.local). |
| 9 | `.github/workflows/deploy.yml` | Variable `VITE_VAPID_KEY` nombrada como `VITE_FIREBASE_VAPID_KEY` en CI → **push notifications rotas en producción**. | Renombrada + añadidas `VITE_GOOGLE_MAPS_API_KEY`, `VITE_WA_NUMBER`, `VITE_FUNCTIONS_BASE_URL`. |
| 10 | `firebase.json` | CSP con `'unsafe-inline'` en `script-src` → XSS efectivo posible. | Eliminado `unsafe-inline`. Scripts inline de `index.html` movidos a archivos externos (`/public/analytics.js`, `/public/schema-ld.json` + loader). |
| 11 | `firebase.json` | `Permissions-Policy` laxa (sin sensores, sin fullscreen). | Endurecida + añadido `Cross-Origin-Resource-Policy`. |

### 🟠 Importantes (bugs / costes)

| # | Archivo | Problema | Corrección |
|---|---------|----------|------------|
| 12 | `src/App.jsx` | Ruta `/login` duplicada (AUTH_ROUTES.LOGIN y literal) + `Route path="*"` duplicado. | Eliminadas; `LoginPage` ya no se importa. |
| 13 | `src/core/contexts/AuthContext.jsx` | Bloqueaba render con `{!loading && children}` → pantalla blanca durante auth. | Expone `loading` en el contexto; consumidores muestran skeleton. |
| 14 | `src/core/contexts/AuthContext.jsx` | `syncUserToFirestore` hacía `getDoc()` en cada `onAuthStateChanged` (~1h). | Cache en `useRef` de UIDs ya sincronizados. |
| 15 | `src/main.jsx` | `ErrorBoundary` anidado dos veces (main + App). | Eliminado el de main.jsx (el de App.jsx cubre todo). |
| 16 | `src/core/services/notificationService.js` | Solo leía `VITE_VAPID_KEY`; el CI pasaba `VITE_FIREBASE_VAPID_KEY`. | Acepta ambas + warn si ninguna está definida. |
| 17 | `package.json` | `firebase-functions@^7` en el cliente → +40KB de bundle. | Eliminado (solo vive en `functions/`). Añadidos scripts `deploy*`. |
| 18 | `vite.config.js` | `drop_console: true` eliminaba `console.error` → silenciaba señales útiles en prod. | Solo se eliminan `log/info/debug/trace`; `error/warn` se mantienen. |
| 19 | `firestore.indexes.json` | Faltaban índices para queries combinadas del catálogo público. | Añadidos 7 índices: `publicProperties` por ciudad/tipo/precio, `contracts` por tipo+status, `payments` collection-group, `notifications` con filtro `read`. |
| 20 | `eslint.config.js` | Reglas mínimas, sin accesibilidad, sin separación cliente/Functions. | jsx-a11y, separación por target, reglas estrictas (no-var, eqeqeq). |
| 21 | `README.md` | Docs genéricas, sin `.env`, sin setup real. | Reescrito con pasos concretos, checklist de deploy y nota sobre la deuda técnica de `users/{email}`. |
| 22 | `.env.example` | No existía. | Creado. |
| 23 | `index.html` | Scripts inline (GA + 3 JSON-LD) incompatibles con CSP endurecido. | Extraídos a `/public/analytics.js`, `/public/schema-ld.json`, `/public/schema-ld-loader.js`. |

---

## ⏳ Pendientes (no aplicados aún — requieren decisiones de negocio o migración de datos)

### 🔴 Deuda técnica crítica

- **`users/{email}` → `users/{uid}`**: el email como ID es un antipatrón grave. Si un usuario cambia de email en Firebase Auth, se crea un doc huérfano, pierde rol y otro usuario podría reclamar el email anterior. Migración requiere:
  1. Script de migración que lea todos los docs de `/users` y los recree con `uid` como ID.
  2. Actualizar TODAS las reglas de Firestore (`isOwner(userId)` debe pasar a comparar `request.auth.uid`).
  3. Actualizar `AuthContext`, `user.service.js`, `functions/index.js` y TODAS las queries que usen email.
  4. Ventana de mantenimiento + backup de Firestore antes de correr.

  **Esta migración NO se aplicó porque requiere acceso al proyecto de producción.**

### 🟠 Importantes para aplicar después

- `Route`-level `ErrorBoundary`: actualmente solo hay uno global. Un crash en `PropertyDetail` tumba toda la app.
- Sin tests. Mínimo para flujos de contratos/pagos: Vitest + `@firebase/rules-unit-testing` + MSW.
- `functions/index.js` tiene 545 líneas. Extraer cada función a `functions/src/<nombre>.js`.
- `firebase-functions@^6` en `functions/package.json` mientras el CI puede correr Node 22 con v7. Actualizar o dejar fijo.
- `logo.jpg.png` (doble extensión) — renombrar a `.png` limpio.
- `public/f2dba2f566414e2288dc806c72764b89.txt` — verificar si todavía es necesario.
- `redirectToCustomDomain` export sin rewrite que lo invoque → código muerto, eliminar o enrutar.
- Headers adicionales: considerar `Cross-Origin-Embedder-Policy` si se necesita SharedArrayBuffer para Jitsi.
- Imágenes `og-default.jpg` y `logo-ryb.png` convertir a WebP/AVIF con fallback.
- Husky + lint-staged en pre-commit.

### 🟡 Mejoras de UX / calidad

- `useMemo` de `currentUser` en `AuthContext` invalida en cada render porque depende de dos objetos — podría pasarse a primitivos.
- Toasts importados directamente en el context → acopla UI con lógica.
- Spinner de `PageLoader` depende de clases Tailwind custom (`border-primary`); añadir fallback CSS inline.
- Varias landings públicas (`CatalogPage`, `HomePage`) no están en lazy load aunque son candidatas.

---

## 📋 Secuencia de despliegue recomendada tras estas correcciones

```bash
# 0. Asegurar que los secrets nuevos están en GitHub Actions:
#    VITE_VAPID_KEY, VITE_GOOGLE_MAPS_API_KEY, VITE_WA_NUMBER

# 1. Deploy de reglas primero (sin reglas, el CSP puede bloquear assets)
firebase deploy --only firestore:rules,storage:rules

# 2. Deploy de Functions (con los nuevos secrets si aplica)
firebase deploy --only functions

# 3. Deploy de Hosting (ya con el CSP endurecido y scripts externos)
npm run build
firebase deploy --only hosting:production

# 4. Verificar en el navegador:
#    - Consola sin errores de CSP
#    - Network: /analytics.js y /schema-ld.json cargan 200
#    - App Check: NO debe mostrar "Debug token" en producción
#    - Notificaciones push: permiso y token registrados correctamente
```

---

## 🧪 Comandos útiles de verificación

```bash
# Analizar bundle de producción
npm run build && du -sh dist/assets/js/*.js | sort -h

# Auditar CSP en headers reales (después de deploy)
curl -I https://inmobiliaria-ryb-y-asociados.com/ | grep -i content-security

# Testear reglas con emulador (antes de deploy)
firebase emulators:start --only firestore

# Ver qué variables Vite está inyectando realmente
npm run build -- --debug | grep VITE_
```
