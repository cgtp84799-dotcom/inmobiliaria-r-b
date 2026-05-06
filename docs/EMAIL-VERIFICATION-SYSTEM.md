# Sistema de verificación de email custom

Este parche reemplaza el flujo de verificación de Firebase Auth (cuya plantilla
no se puede personalizar) por un sistema propio basado en Cloud Functions, y
arregla la duplicación del correo de bienvenida que llegaba al mismo tiempo
que el de verificación.

## Resumen del problema original

1. **Cliente**: al registrarse, recibía simultáneamente:
   - El correo de verificación de Firebase Auth (plantilla genérica e
     inmutable, dominio `noreply@*.firebaseapp.com`).
   - El correo de bienvenida del portal (porque `onUserCreated` se disparaba
     al crearse el doc en `/users/{email}`).
   - → Confuso para el usuario, peor branding.

2. **Staff (admin/member)**: al ser creado por un admin desde el panel, recibía
   inmediatamente el correo de bienvenida del equipo, antes de haber siquiera
   configurado su contraseña.

3. **Solicitudes de acceso**: el correo a admins funciona bien, pero el flujo
   se confundía con el welcome del cliente cuando luego se aprobaba.

## Solución

### Para clientes (viewer)

```
Registro → ClientAuthPage llama a la CF requestEmailVerification
         → Email custom con link /verificar-email/:token
              ↓
         Usuario hace click → EmailVerifyTokenPage
                            → CF confirmEmailVerification
                              · marca emailVerified=true en Auth + Firestore
                              · solo si role==='viewer' marca status='active'
                                (staff usa flujo aparte de primer login)
                              · onUserWelcomeOnReady detecta el cambio
                                  → envía welcomeEmail (UNA SOLA VEZ)
```

El polling existente en `EmailVerificationPage` sigue funcionando: cuando el
usuario hace click en el link en otra pestaña, esta detecta el cambio y
redirige al portal.

### Para staff (admin/member)

```
createUserByAdmin → crea Auth user + doc /users con status='pending'
                  → envía email custom "configura tu contraseña"
                    (plantilla corporativa, link generado vía Admin SDK)
                       ↓
                    Usuario configura contraseña
                       ↓
                    Hace login por primera vez
                       ↓
                    AuthContext.loadUserData detecta status='pending'
                      → escribe status='active' + firstLoginAt
                      → onUserWelcomeOnReady envía welcome del equipo
                        (UNA SOLA VEZ)
```

### Solicitudes de acceso

Sin cambios — funciona como antes:

- `/solicitar-acceso` → crea `accessRequests` → email a admins
- Admin aprueba → email "tu acceso fue aprobado" al solicitante
- Admin crea cuenta interna manualmente → flujo de staff arriba

## Archivos modificados

### Backend (Cloud Functions)

| Archivo | Cambio |
|---|---|
| `functions/src/emailVerification.js` | **NUEVO** — `requestEmailVerification`, `confirmEmailVerification`, `sendStaffPasswordSetup` |
| `functions/src/emails/users.js` | **+** `emailVerificationLinkEmail`, `staffPasswordSetupEmail` |
| `functions/index.js` | **Refactor** `onUserCreated` (welcome diferido), **NUEVO** trigger `onUserWelcomeOnReady`, exports de las CFs HTTP, refactor `createUserByAdmin` (status=pending por default + envío de email custom) |

### Frontend

| Archivo | Cambio |
|---|---|
| `src/modules/auth/services/emailVerification.service.js` | **NUEVO** — cliente HTTP de las CFs |
| `src/modules/auth/pages/EmailVerifyTokenPage.jsx` | **NUEVO** — landing del link del email |
| `src/modules/auth/pages/EmailVerificationPage.jsx` | Reenviar usa la CF custom |
| `src/modules/auth/pages/ClientAuthPage.jsx` | Quita `sendEmailVerification`, usa la CF custom |
| `src/modules/users/services/user.service.js` | Default `status='pending'` (antes forzaba `active`) |
| `src/modules/users/components/UserEditModal.jsx` | Default `status=PENDING` al crear + texto explicativo |
| `src/core/contexts/AuthContext.jsx` | Activa staff (pending → active) en primer login |
| `src/core/config/routes.config.js` | **+** `EMAIL_VERIFY_TOKEN: '/verificar-email/:token'` |
| `src/App.jsx` | **+** ruta para `EmailVerifyTokenPage` |

### Reglas y datos

| Archivo | Cambio |
|---|---|
| `firestore.rules` | **+** colección `/emailVerifications` (deny-all desde cliente), regla `userStaffSelfActivation` para activación de staff |
| `firestore.indexes.json` | **+** índices para `emailVerifications(email,createdAt)` y `(email,usedAt)` |
| `tests/firestore/users.test.js` | **+** 11 tests para activación de staff y `/emailVerifications` |

## Despliegue

```bash
# 1. Reglas e índices (rápido, primero)
firebase deploy --only firestore:rules,firestore:indexes

# 2. Cloud Functions (más lento — ~2-3 min)
firebase deploy --only functions

# 3. Frontend
npm run build
firebase deploy --only hosting
```

> **Nota**: La primera vez que se haga query a `emailVerifications`, Firestore
> puede tardar unos segundos en provisionar los índices nuevos. No es
> bloqueante — la CF maneja el caso `recentSnap.size === 0` correctamente.

## Migración de datos existentes

### Usuarios staff existentes

Los usuarios admin/member que ya están con `status='active'` no se ven
afectados (la transición pending → active ya pasó implícitamente). El nuevo
default `status='pending'` solo aplica a usuarios CREADOS desde ahora vía
`createUserByAdmin`.

### Clientes existentes

Los clientes con `emailVerified=true` en Firestore no reciben el welcome
(idempotencia: `welcomeEmailSentAt` se marca al enviar). Los clientes
"limbo" (verificados en Auth pero `emailVerified=false` en Firestore) se
sincronizarán la próxima vez que entren al portal — el polling en
`EmailVerificationPage` lo arregla, y el welcome se enviará entonces.

## Probar localmente

```bash
# Emulators
firebase emulators:start --only functions,firestore,auth

# En otra terminal
cd functions && npm run serve
```

Los endpoints HTTP quedan en:
- `http://127.0.0.1:5001/<project>/us-central1/requestEmailVerification`
- `http://127.0.0.1:5001/<project>/us-central1/confirmEmailVerification`

Para que el frontend los apunte al emulador, setea en `.env.local`:

```
VITE_FUNCTIONS_BASE_URL=http://127.0.0.1:5001/<project>/us-central1
```

## Troubleshooting

### El cliente no recibe el email de verificación

1. Revisa los logs de la CF: `firebase functions:log --only requestEmailVerification`
2. Verifica que los secretos `GMAIL_USER` y `GMAIL_PASS` estén definidos:
   `firebase functions:secrets:access GMAIL_USER`
3. Si Gmail bloquea por "less secure app", regenerar el App Password.

### El token "expira" o "no se encuentra"

- TTL es 24h. Verifica el reloj del servidor.
- Cada nuevo `requestEmailVerification` invalida los tokens previos del
  mismo email — si el usuario hizo "Reenviar", el link viejo deja de servir.

### El staff no recibe welcome al hacer primer login

1. Verifica `status='pending'` en `/users/{email}`.
2. Revisa logs de `onUserWelcomeOnReady`: `firebase functions:log --only onUserWelcomeOnReady`
3. Si `welcomeEmailSentAt` ya estaba seteado, no se reenvía (es idempotente).
   Para forzar, borra ese campo desde la consola y haz logout+login.

### El admin recibe email de "solicitud de acceso" repetido

Sin cambios en este flujo — si pasa, es problema preexistente (revisar
`onAccessRequestCreated`).
