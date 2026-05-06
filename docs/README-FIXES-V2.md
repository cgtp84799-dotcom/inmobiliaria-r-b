# RYB tests — corrección raíz v2

## Qué corrige

1. **Vite se cae por `react-is` faltante**
   - `recharts` importa `react-is` y tu instalación no lo tiene.
   - Esto causa el crash de Vite y después el navegador muestra `ERR_CONNECTION_REFUSED` / `ERR_CONNECTION_RESET`.

2. **Tests Firestore corriendo en paralelo**
   - Todos usan el mismo proyecto del emulador: `demo-ryb-test`.
   - Cada archivo ejecuta `env.clearFirestore()` en `beforeEach`.
   - En paralelo, un test borra los datos que otro test acaba de sembrar. Por eso aparecen `NOT_FOUND`, roles que desaparecen y `Null value error`.
   - `vitest.config.js` ahora usa `fileParallelism: false`.

3. **Cliente portal vs staff viewer mezclados**
   - Claude usó `role: 'viewer'` para simular clientes.
   - Pero en tus reglas `viewer` es staff de solo lectura (`canRead()`), por eso podía leer clientes/contratos/visitas ajenas.
   - Los tests ahora usan `portal@ryb.com` sin doc en `/users` para simular cliente real del portal.

4. **Bug real en reglas de contratos subcollections**
   - `/contracts/{id}/payments/{id}` intentaba evaluar `resource.data.clientEmail` sobre el pago, pero ese campo vive en el contrato padre.
   - `firestore.rules` ahora consulta el contrato padre para validar ownership.

5. **Bug real en aislamiento de chat**
   - Las reglas permitían que cualquier admin leyera conversaciones aunque no estuviera en `participants[]`.
   - El brief exige aislamiento por participantes incluso para admin no participante.
   - `firestore.rules` ahora exige estar en `participants[]`.

6. **Typo en test de functions**
   - `tests/functions/http-handlers.test.js` terminaba con una `s` suelta.

## Cómo aplicar

Copia estas carpetas/archivos sobre la raíz de tu proyecto:

- `firestore.rules`
- `vitest.config.js`
- `tests/firestore/*`
- `tests/functions/http-handlers.test.js`

Luego ejecuta en PowerShell desde la raíz del proyecto:

```powershell
npm install react-is@^19.2.0 --save
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

## Cómo correr correctamente

Terminal 1:

```powershell
npm run emulator
```

Espera a ver: `All emulators ready!`

Terminal 2:

```powershell
npm run test:rules
npm run test:fast
```

Para correr todo:

```powershell
npm test
```

## Sobre Node

Estás usando Node `v24.12.0`. Si siguen apareciendo errores raros de Firebase/Vite, usa Node 22 LTS para este proyecto.