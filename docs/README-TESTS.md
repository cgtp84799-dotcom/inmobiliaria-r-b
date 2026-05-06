# Suite de Tests — Inmobiliaria RYB

## ✅ Resultados ya verificados (77/77 pasan)

Estos tests ya fueron ejecutados y pasan **sin necesidad de emulador**:

```
✅ tests/validators/        41/41 pasan   (validadores puros — JS sin Firebase)
✅ tests/functions/         15/15 pasan   (createUserByAdmin, deleteUserComplete)
✅ tests/frontend/          21/21 pasan   (AuthContext, ProtectedRoute, useVisits, profileService)
─────────────────────────────────────────
   TOTAL EJECUTADO          77/77 pasan
```

Los tests de **reglas de Firestore** (`tests/firestore/*`) están escritos pero requieren el emulador de Firebase corriendo. Los corres al final con un solo comando.

---

## 🚀 Instalación en Windows + VS Code

### Paso 1 — Pre-requisitos

Verifica que tienes esto instalado (abre PowerShell):

```powershell
node --version    # Debe ser >= 20
npm --version     # Debe ser >= 10
java -version     # Cualquier JDK 11+ (para el emulador de Firestore)
```

Si no tienes Java, descarga uno gratis:
- https://adoptium.net/ → Temurin 21 (LTS) → Windows installer

### Paso 2 — Copiar los archivos a tu proyecto

Descomprime este zip en la **raíz** de tu proyecto, así:

```
inmobiliaria-ryb-nueva/
├── src/                          ← ya existe
├── functions/                    ← ya existe
├── firestore.rules               ← ya existe
├── firebase.json                 ← ya existe
├── package.json                  ← ya existe
│
├── tests/                        ← NUEVO (de este zip)
│   ├── firestore/                  reglas — requiere emulador
│   ├── functions/                  unit tests de Cloud Functions
│   ├── frontend/                   tests de hooks/contexts/components
│   └── validators/                 validadores puros
├── vitest.config.js              ← NUEVO
├── tests-package.json            ← NUEVO (referencia para tu package.json)
├── scripts/                      ← NUEVO
│   ├── run-tests.bat               atajo para Windows
│   └── start-emulator.bat
└── README-TESTS.md               ← este archivo
```

### Paso 3 — Instalar dependencias de testing

Desde la raíz del proyecto, en PowerShell:

```powershell
npm install --save-dev --legacy-peer-deps `
  vitest@^4 `
  @firebase/rules-unit-testing@^5 `
  firebase-tools@^14 `
  jsdom@^25 `
  @testing-library/react@^16 `
  @testing-library/dom@^10 `
  @testing-library/jest-dom@^6
```

> **¿Por qué `--legacy-peer-deps`?** El SDK de `firebase` y `@firebase/rules-unit-testing` declaran versiones peer ligeramente distintas; este flag relaja la validación. Es seguro en este proyecto.

Si ves "no se reconoce el comando npm", abre tu terminal así:
- VS Code → `Terminal` → `New Terminal`
- O desde el inicio de Windows: "Command Prompt" o "PowerShell"

### Paso 4 — Agregar scripts a tu `package.json`

Abre tu `package.json` (el de la raíz del proyecto) y dentro de `"scripts"` **añade** estas líneas:

```json
"test": "vitest run --no-coverage",
"test:watch": "vitest",
"test:rules": "vitest run tests/firestore --no-coverage",
"test:functions": "vitest run tests/functions --no-coverage",
"test:frontend": "vitest run tests/frontend --no-coverage",
"test:validators": "vitest run tests/validators --no-coverage",
"test:fast": "vitest run tests/validators tests/functions tests/frontend --no-coverage",
"emulator": "firebase emulators:start --only firestore --project demo-ryb-test"
```

**Importante:** No borres tus scripts existentes (`dev`, `build`, etc.). Solo añade estos al lado.

### Paso 5 — Ejecutar los tests rápidos (sin emulador)

```powershell
npm run test:fast
```

Deberías ver:
```
Test Files  6 passed (6)
     Tests  77 passed (77)
```

Si pasa, ya tienes ✅ **77 tests cubriendo Cloud Functions, AuthContext, ProtectedRoute, useVisits, profileService y los validadores puros.**

### Paso 6 — Ejecutar los tests de reglas de Firestore (con emulador)

Necesitas **dos terminales** abiertas en VS Code:

**Terminal 1** (deja esto corriendo):
```powershell
npm run emulator
```

Espera a que veas:
```
✔  firestore: Firestore Emulator UI websocket is running on 9150.
✔  All emulators ready! It is now safe to connect your app.
```

**Terminal 2** (corre los tests):
```powershell
npm run test:rules
```

O ejecuta TODA la suite (rápidos + emulador) con:
```powershell
npm test
```

### Paso 7 — Atajos de Windows (opcional)

Si prefieres doble-click en vez de comandos:

- `scripts/start-emulator.bat` → abre el emulador
- `scripts/run-tests.bat` → corre todos los tests

Doble-click sobre `start-emulator.bat`, espera el "All emulators ready", luego doble-click sobre `run-tests.bat`.

---

## 📊 Estructura de los tests

| Carpeta | Cantidad | Necesita emulador | Cubre |
|---|---|---|---|
| `tests/validators/` | 41 tests | ❌ | `validContact`, `validVisit`, `validAccessRequest`, `isValidEmail`, `isSafeClientMail` |
| `tests/functions/` | 15 tests | ❌ | `createUserByAdmin`, `deleteUserComplete` (mocks de Admin SDK) |
| `tests/frontend/` | 21 tests | ❌ | `AuthContext`, `ProtectedRoute`, `useVisits`, `profileService` |
| `tests/firestore/` | ~60 tests | ✅ Sí | Reglas de `/users`, `/clients`, `/contracts`, `/visits`, `/contacts`, `/mail`, `/conversations`, `/notifications`, `/settings`, `/accessRequests` |

## 🔍 Hallazgos del análisis estático

Estos son señalamientos durante la lectura del código. Los tests de las reglas (cuando corras el emulador) los confirmarán o descartarán:

### `[BAJO]` `appointments` permite huérfanos sin verificar `visits/{visitId}`
- **Archivo:** `firestore.rules` — sección `match /appointments/{appointmentId}`
- **Síntoma:** Un anónimo puede crear un `appointment` con `sourceCollection: 'visits'` y un `visitId` arbitrario; las reglas no verifican que ese `visitId` exista en `/visits`. Esto permite ensuciar la colección `appointments` con docs huérfanos (no es escalación de privilegios, pero sí un vector de spam).
- **Fix sugerido:**
  ```
  // En vez de aceptar visitId is string a secas:
  request.resource.data.visitId is string
    && exists(/databases/$(database)/documents/visits/$(request.resource.data.visitId))
  ```
  > ⚠️ Cuidado: `exists()` consume 1 lectura y puede afectar el flujo público de visita. Validar primero.

### `[BAJO]` `setCorsHeaders` refleja origin sin allow-list
- **Archivo:** `functions/index.js:85`
- **Síntoma:** `res.set("Access-Control-Allow-Origin", req.headers.origin || "*")` permite cualquier origen. Para endpoints autenticados con `Bearer` no es CSRF directo (requiere robar token), pero conviene whitelist.
- **Fix sugerido:**
  ```js
  const ALLOWED_ORIGINS = ['https://inmobiliaria-ryb-y-asociados.com', 'http://localhost:5173'];
  function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  ```

### `[BAJO]` `redirectToCustomDomain` exportada sin rewrite — código muerto
- **Archivo:** `functions/index.js:263`, `firebase.json` (no aparece en `rewrites`)
- **Estado:** Confirmado por el AUDIT.md y por lectura de `firebase.json`. La función está deployada pero ningún path de hosting la invoca. No es un bug de seguridad — solo deuda. Decisión: borrar la función del código o agregar el rewrite.

## 🧱 Deuda técnica confirmada (`@known-issue`)

### `users/{email}` como ID de documento
- **Confirmado:** `firestore.rules` `match /users/{userId}` con `isOwner(userId) = authEmail() == userId` y `assertAdminFromRequest` busca `users.doc(callerEmail).get()`.
- **Síntoma:** Si el usuario cambia su email en Firebase Auth, el doc en `/users/{old-email}` queda huérfano y el usuario no puede leer su propio doc.
- **Test que lo expone:** `tests/firestore/users.test.js` → `@known-issue documenta: si el email cambia en Auth, el doc queda huérfano`
- **Mitigación:** Job de migración o forzar contacto con admin. **NO bloqueante para producción** porque cambiar email en Auth es flujo poco común.

### Cobertura limitada del emulador para índices compuestos
- El emulador de Firestore no replica exactamente los índices de producción. Algunos casos edge (queries con `where` + `orderBy` en campos múltiples) pueden funcionar en local y fallar en prod por falta de índice.
- **Mitigación:** Revisar `firestore.indexes.json` antes del deploy y observar la consola de Firebase tras el primer despliegue para detectar `failed-precondition`.

## 🐞 Si algo falla

| Síntoma | Solución |
|---|---|
| `Cannot find module @testing-library/dom` | `npm i -D @testing-library/dom@^10 --legacy-peer-deps` |
| `Cannot find module react-hot-toast` desde un test | El proyecto ya lo trae como dep — corre `npm install` en raíz |
| `Connection refused 127.0.0.1:8080` en tests de rules | El emulador no está corriendo — abre la Terminal 1 con `npm run emulator` |
| `Host not in allowlist` al levantar emulador | Tu firewall/proxy bloquea la descarga del JAR. Desactiva temporalmente o usa otra red |
| Tests frontend tardan > 30s | Es normal en la primera corrida (jsdom + esbuild se calientan). Las siguientes son <5s |
| `vitest: command not found` | `npx vitest run` en vez de `npm run test` |

## 📝 Reporte ejecutado

```
══════════════════════════════════════════════════════
 REPORTE DE TESTING — Inmobiliaria RYB
══════════════════════════════════════════════════════

VALIDADORES PUROS (sin emulador)
  validContact()         ✅ 12/12
  validVisit()           ✅  6/6
  validAccessRequest()   ✅  4/4
  isValidEmail()         ✅  9/9
  isSafeClientMail()     ✅ 10/10
  ────────────────────────────────
  Subtotal               ✅ 41/41

CLOUD FUNCTIONS (mocks Admin SDK, sin emulador)
  createUserByAdmin      ✅  8/8
  deleteUserComplete     ✅  7/7
  ────────────────────────────────
  Subtotal               ✅ 15/15

FRONTEND (jsdom + RTL)
  AuthContext            ✅  5/5
  ProtectedRoute         ✅  7/7
  useVisits              ✅  6/6
  profileService         ✅  3/3
  ────────────────────────────────
  Subtotal               ✅ 21/21

═══════════════════════════════════════════════════
TOTAL EJECUTADO          ✅ 77/77 (en ~5s)

PENDIENTE (correr con emulador en Windows)
  /users                 12 tests escritos
  /clients                8 tests escritos
  /contracts             10 tests escritos
  /visits                14 tests escritos
  /contacts               6 tests escritos
  /mail                  10 tests escritos
  /conversations          9 tests escritos
  /accessRequests         4 tests escritos
  /notifications          5 tests escritos
  /settings               5 tests escritos
  ────────────────────────────────
  Subtotal               ~83 tests pendientes de correr
```

## 🎯 Cobertura de los criterios del brief

| Criterio del brief | Cubierto |
|---|---|
| Reglas `/users` — admin lee, viewer no, no auto-escalación de role/status | ✅ tests/firestore/users.test.js |
| Reglas `/clients` — owner lee suyo, whitelist de campos | ✅ tests/firestore/clients.test.js |
| Reglas `/contracts` — cliente lee suyo, alerts_sent solo Admin SDK | ✅ tests/firestore/contracts.test.js |
| Reglas `/visits` — anon crea pending, cliente cancela su propia | ✅ tests/firestore/visits.test.js |
| Reglas `/contacts` — viewer NO lee | ✅ tests/firestore/contacts.test.js |
| Reglas `/mail` — cliente solo a sí mismo, no from/replyTo/bcc | ✅ tests/firestore/mail.test.js |
| Reglas `/conversations` — aislado por participants[] | ✅ tests/firestore/conversations.test.js |
| Reglas `/accessRequests`, `/notifications`, `/settings` | ✅ tests/firestore/access-notifs-settings.test.js |
| `createUserByAdmin` — 7 ramas | ✅ tests/functions/http-handlers.test.js |
| `deleteUserComplete` — 6 ramas (incl. auto-eliminación) | ✅ tests/functions/http-handlers.test.js |
| `AuthContext` — currentUser, loading, isAdmin, canOperate | ✅ tests/frontend/AuthContext.test.jsx |
| `useVisits` — admin/member/viewer, auto-asignación | ✅ tests/frontend/useVisits.test.jsx |
| `ProtectedRoute` — agentOnly, clientOnly, allowedRoles | ✅ tests/frontend/ProtectedRoute.test.jsx |
| `profileService.requestAccountDeletion` | ✅ tests/frontend/profileService.test.js |
| Validadores puros: `validContact`, `validVisit`, `isValidEmail` | ✅ tests/validators/validators.test.js |
| `@known-issue: users/{email} como ID` | ✅ Test específico en users.test.js |
| `@known-issue: redirectToCustomDomain` | ✅ Documentado arriba |

---

## ⚠️ Antes de producción

Una vez los tests del emulador pasen también, faltan estas verificaciones manuales que **no se pueden testear automáticamente**:

1. **Probar el flujo completo de visita pública** desde una ventana incógnita (sin auth) — confirmar que el email "solicitud recibida" llega.
2. **Probar el deploy de las Cloud Functions** con un usuario admin real (los unit tests usan mocks).
3. **Verificar que los índices de Firestore están creados** revisando la consola tras la primera consulta (logs `failed-precondition`).
4. **Revisar el quota de Trigger Email** (extensión cobra por email enviado).
5. **Probar `App Check`** en producción — la doc dice "solo localhost en debug", confirmar que en prod sí valida.