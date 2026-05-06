# MIGRATION.md — Auditoría 2026-05

Esta auditoría aplicó **todas las correcciones críticas e importantes** identificadas en `docs/AUDIT.md`. Este documento explica qué cambió, qué hay que hacer al aplicarlo en tu repo y qué quedó pendiente para futuras iteraciones.

---

## ⚡ TL;DR

1. `npm install` (porque agregamos `jspdf` a deps).
2. Renombrar dos archivos de logo en `public/` (instrucciones abajo).
3. Migrar status de propiedades en Firestore (script abajo) **antes del próximo deploy**.
4. Verificar que `.firebaserc` apunta al projectId correcto.
5. Deploy en orden: rules → functions → hosting.

Todo lo demás (código) ya está aplicado en este repo.

---

## 🔴 Bugs críticos arreglados

### 1. `jspdf` faltaba en `package.json`

`pdfUtils.js` hacía `import('jspdf')` pero el paquete no estaba en `dependencies`. **Esto rompía la descarga de PDF en producción.**

**Aplicado:** se agregó `"jspdf": "^2.5.2"` en `package.json` y se incluyó en el chunk `pdf-lazy` de `vite.config.js`.

**Acción al aplicar el cambio en tu repo:**

```bash
npm install
```

### 2. Mismatch de status de propiedades

Las Firestore Rules solo permiten leer propiedades con `status == 'published'`, pero el código aceptaba `'disponible' / 'available' / 'active'` como sinónimos. Resultado: muchas propiedades quedaban invisibles para usuarios sin sesión.

**Aplicado:**
- Enum canónico en `src/modules/properties/types/property.types.js` con helpers `normalizePropertyStatus()` e `isPublicStatus()` que aceptan los aliases legacy en lectura.
- `getPublicProperties()` ahora filtra `where('status', '==', 'published')` directamente en Firestore.
- `PropertyForm` el `<select>` ahora escribe valores canónicos (`published / reserved / sold / rented / draft / inactive`).
- `contract.types.js` `PROPERTY_STATUS` re-mapeado a los valores canónicos.

**Acción al aplicar el cambio en tu repo (recomendada):**

Migrar la data existente. Crea `scripts/migrate-property-status.js` con este contenido y ejecútalo una sola vez:

```js
// scripts/migrate-property-status.js
// Uso: ejecutar con un service account con permisos de admin.
//
//   node scripts/migrate-property-status.js
//
// Convierte status legacy en español a los valores canónicos.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync(new URL('./service-account.json', import.meta.url))
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const MAP = {
  disponible: 'published',
  available: 'published',
  active: 'published',
  reservada: 'reserved',
  vendida: 'sold',
  arrendada: 'rented',
  inactiva: 'inactive',
  borrador: 'draft',
};

async function run() {
  const snap = await db.collection('properties').get();
  let updated = 0;
  const batch = db.batch();
  for (const doc of snap.docs) {
    const status = String(doc.data().status || '').toLowerCase();
    if (MAP[status]) {
      batch.update(doc.ref, { status: MAP[status] });
      updated++;
    }
  }
  if (updated > 0) await batch.commit();
  console.log(`Migrated ${updated} properties.`);
}
run().catch(console.error);
```

**Si NO migras la data**, el código nuevo sigue funcionando porque acepta los aliases en lectura. Pero el filtro Firestore (`where status == 'published'`) NO los aceptará y esas propiedades dejarán de aparecer en el catálogo público.

### 3. Logos con doble extensión

Los archivos `public/logo.jpg.png` y `public/logo-ryb.png` tenían nombres confusos. **Las referencias en código ya se actualizaron** a `logo-dark.png` y `logo-light.png`.

**Acción al aplicar el cambio en tu repo:**

```bash
cd public
mv logo.jpg.png logo-dark.png
mv logo-ryb.png logo-light.png
```

Si no lo haces, las imágenes se romperán (404). El código del repo ya apunta a los nombres nuevos en 19 lugares + `site.webmanifest`.

### 4. Mismatch de projectId en CORS

`functions/index.js` tenía whitelist con `inmobiliaria-ryb-nueva.web.app` pero el projectId real es `inmobiliaria-ryb-y-asociados`. Corregido.

**Acción al aplicar el cambio en tu repo:** verifica que `.firebaserc` apunte al projectId correcto (`inmobiliaria-ryb-y-asociados`). Ya está bien en este repo, pero si tu repo local se modificó, revísalo.

### 5. Cloud Function muerta `redirectToCustomDomain`

Estaba exportada pero sin rewrite que la invocara. Pagaba compute sin uso. **Eliminada.**

**Acción al aplicar el cambio en tu repo:**

```bash
# Después del próximo deploy de functions, eliminar la función zombi de Firebase
firebase functions:delete redirectToCustomDomain --region us-central1
```

(El deploy normal NO elimina funciones que dejaste de exportar — hay que borrarlas explícitamente.)

### 6. Código muerto en `visit.service.js`

~280 líneas de templates HTML y un `sendMail()` que nunca se llamaba (los emails los envía el backend `onVisitStatusChanged`). **Eliminadas.** El archivo pasó de 599 a 369 líneas.

### 7. `<SettingsFab />` visible en rutas de auth

Aparecía incluso en `/login`, `/acceso-clientes`, `/solicitar-acceso`. **Solucionado** con un wrapper `ConditionalSettingsFab` en `App.jsx`.

---

## 🟠 Limpieza importante aplicada

### Comentarios bitácora eliminados

Se removieron **110 comentarios** tipo `// ★ FIX (auditoría):`, `// ✅ DESPUÉS`, `// FIX [SEGURIDAD]:` que documentaban el historial de fixes y confundían al lector. El historial ahora vive en `docs/AUDIT.md` y en Git.

### Documentación movida a `docs/`

Los archivos `AUDIT.md`, `AUDIT-PLAN.md`, `README-FIXES-V2.md`, `README-TESTS.md`, `AGENTS_MODULE_README.md` se movieron a `docs/`. El `README.md` raíz quedó como entrypoint limpio.

### Archivos muertos eliminados

- `src/modules/users/utils/syncUsers.js` — duplicaba lógica de `AuthContext.syncUserToFirestore`, no se importaba en ninguna parte.
- `src/scripts/migrateUsers.js` — script one-shot ya ejecutado, no se importaba.
- `fix-deps-and-cache.bat` — script Windows-only de troubleshooting de Vite, mejor en docs.

### `BASE_URL` centralizado

Se creó `src/core/config/site.config.js` (ESM) y `functions/src/site.config.js` (CJS). Las **14 declaraciones hardcoded** de `https://inmobiliaria-ryb-y-asociados.com` ahora importan `SITE_URL`.

**Beneficio:** cambiar de dominio = cambiar **un solo archivo** (más el equivalente CJS para functions).

### CORS endurecido

`functions/index.js` acepta orígenes solo de la whitelist explícita; rechaza cualquier otro silenciosamente (no echo `*`).

### Status legacy aceptados en lectura

`functions/index.js` `PUBLIC_STATUS` y `useAgentDashboard.js` `ACTIVE_PROPERTY_STATUSES` ahora aceptan tanto `'published' / 'reserved'` como los aliases legacy en español, para no romper data existente durante la migración.

---

## 📋 Checklist de aplicación

Después de aplicar este patch en tu repo, ejecuta en orden:

```bash
# 1. Instalar nuevas deps (jspdf)
npm install

# 2. Renombrar logos físicos
cd public
mv logo.jpg.png logo-dark.png
mv logo-ryb.png logo-light.png
cd ..

# 3. Lint + tests locales
npm run lint
npm test

# 4. Build de prueba
npm run build

# 5. Si todo pasa, migrar data de propiedades (opcional pero recomendado)
node scripts/migrate-property-status.js  # solo si lo creaste

# 6. Deploy en orden estricto
npm run deploy:rules      # firestore.rules + storage.rules
npm run deploy:functions  # incluye sitemap, prerender, triggers
npm run deploy            # build + hosting

# 7. Eliminar la función zombi en Firebase (one-shot)
firebase functions:delete redirectToCustomDomain --region us-central1

# 8. Verificación post-deploy
curl -I https://inmobiliaria-ryb-y-asociados.com/
# Debe responder 200 con CSP header sin 'unsafe-inline' en script-src

curl https://inmobiliaria-ryb-y-asociados.com/sitemap.xml
# Debe devolver XML con <urlset>

# 9. En el navegador
# - Abrir consola, NO debe haber errores de App Check ni CSP.
# - Probar descarga de PDF de una propiedad (verifica fix de jspdf).
# - Login y navegar a /catalogo: las propiedades deben verse.
```

---

## ⏳ Pendientes (NO aplicados — requieren decisiones de negocio)

### 🔴 Crítico

- **`users/{email}` → `users/{uid}`**: el email como ID es un antipatrón crítico. La migración requiere ventana de mantenimiento, backup, y actualizar TODAS las reglas y queries. Documentado en `docs/AUDIT.md`. **No se aplicó porque requiere acceso a producción.**

### 🟠 Importante

- **Tests de servicios críticos**: `contract.service.js`, `payment` triggers, `property.service.js`. Sin cobertura.
- **Refactor de archivos gigantes**:
  - `src/index.css` (3990 líneas)
  - `CalendarPage.jsx` (1671 líneas)
  - `DashboardPage.jsx` (1525 líneas)
  - `PropertyForm.jsx` (1517 líneas — partir en wizard)
  - `ContractForm.jsx` (1288 líneas — partir en wizard)
  - `functions/index.js` (1353 líneas — extraer cada función)
- **Consolidar `appointments` y `visits`**: dos colecciones con la misma data, riesgo de desync.
- **Sistema de tokens CSS hecho a medias**: ~1250 instancias `bg-slate-*` hardcoded conviven con ~880 `var(--color-*)`. Decidir uno y eliminar el otro.
- **Cookie consent banner UI**: `validConsent()` está en rules pero no veo banner UI conectado. Bloqueo legal para Ley 1581/2012 (Colombia) y GDPR.
- **Error tracking**: setup de Sentry/equivalente. 239 `console.error` sin reportar.
- **PDF vectorial**: migrar `html2canvas` (raster, pesado) a `pdfmake` o `react-pdf`.

### 🟡 Mejoras menores

- Imágenes con `<picture>` + AVIF/WebP + `srcset`.
- `<loading="lazy">` consistente en todos los `<img>`.
- Eliminar `lucide-react` o `react-icons` (sobran iconos en bundle).
- Banner / archivo `public/f2dba2f566414e2288dc806c72764b89.txt` — verificar si es de un servicio activo (Bing/Facebook). Si no, eliminar.
- `tests-package.json` separado del `package.json` principal — evaluar fusión.

---

## 📊 Estadísticas del cambio

- **Archivos modificados:** 60+
- **Archivos eliminados:** 8 (3 código + 5 movidos a docs/)
- **Archivos nuevos:** 4 (`site.config.js` x2, `MIGRATION.md`, `README.md` rescrito)
- **Líneas de código eliminadas:** ~580 (código muerto + comentarios bitácora)
- **Bugs críticos arreglados:** 7
- **Hardcoded strings centralizados:** 14 declaraciones de `BASE_URL`

---

## 🆘 Si algo falla después del deploy

```bash
# Rollback rápido al deploy anterior de hosting
firebase hosting:channel:list
firebase hosting:rollback

# Rollback de functions: deploy de la versión anterior desde Git
git checkout <commit-anterior> -- functions/
firebase deploy --only functions
git checkout HEAD -- functions/

# Rollback de rules: están versionadas en Firebase Console
# Console → Firestore → Rules → Historial → Restaurar
```

Cualquier duda específica, revisa `docs/AUDIT.md` (es vivo y registra el historial completo).

---

## 🔬 Cómo interpretar el output de `npm run lint` y `npm test`

Después de aplicar este patch, al correr lint y test verás:

### Lint warnings esperados

ESLint reportará ~530 **warnings** (no errors). De esos:

- **~150 son de `jsx-a11y/label-has-associated-control`** — labels sin `htmlFor`. Es deuda preexistente del proyecto, no introducida por la auditoría. Se puede arreglar incrementalmente.
- **~80 son de `react-hooks/set-state-in-effect`** — patrón subóptimo de React 19. No rompe nada, marca refactor pendiente.
- **~70 son de `no-unused-vars`** marcando imports tipo `motion` que el linter cree que no se usa pero sí se usa en JSX (falsos positivos del plugin). No rompe nada.
- **0 errors críticos** de `react-hooks/static-components` — ese error ya está arreglado en `Sidebar.jsx`.

### Test failures esperados

`npm test` mostrará:

- **9 suites passing** ✓ (frontend, validators, http handlers, formatCurrency, formatDate, useVisits, AuthContext, ProtectedRoute, profileService).
- **8 suites failed** ✗ con `ECONNREFUSED 127.0.0.1:8080`.

**Esos 8 failures son normales** — son los tests de Firestore Rules que requieren el emulador corriendo. Para correrlos:

```bash
# Terminal 1 — levantar el emulador
firebase emulators:start --only firestore

# Terminal 2 — correr los tests con el emulador disponible
npm test
```

Si solo quieres correr los tests que NO requieren emulador:

```bash
npm run test:fast    # validators + functions + frontend
```

### Build de producción

`npm run build` debe terminar sin errores. Si falla por `jspdf`, asegúrate de haber corrido `npm install` después de aplicar este patch (para que tome la nueva dependencia agregada en `package.json`).

