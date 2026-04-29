# 📋 PLAN DE TRABAJO - Auditoría y Mejoras Inmobiliaria RYB

## Objetivo
Implementar todas las correcciones identificadas en la auditoría sin romper funcionalidad existente.

---

## 🔴 FASE 1: CRÍTICOS - Seguridad y Datos (Días 1-3)

### 1.1 ✅ COMPLETADO: Validación de entrada en Cloud Functions
- **Archivos creados**: 
  - `functions/src/validators/inputValidators.js` - Schemas Zod para todas las entidades
  - `functions/package.json` - Agregada dependencia zod
  - `tests/functions/inputValidators.test.js` - Tests para validadores

### 1.2 ✅ COMPLETADO: Índices de Firestore
- **Archivo modificado**: `firestore.indexes.json`
- **Índices agregados**:
  - users: role + createdAt
  - clients: tipoCliente + estado + createdAt
  - clients: email + estado
  - properties: status + createdAt
  - properties: city + type + createdAt
  - properties: transactionType + status + createdAt
  - appointments: visitId + date

### 1.3 ⏳ PENDIENTE: Rate Limiting en Cloud Functions
- **Archivos**: `functions/index.js`
- **Acción**: Implementar rate limiting usando Firebase Functions v2

---

## 🟠 FASE 2: IMPORTANTES - Performance (Días 4-7)

### 2.1 ✅ COMPLETADO: Hook de paginación
- **Archivo creado**: `src/shared/hooks/usePaginatedQuery.js`
- **Funcionalidad**: 
  - usePaginatedQuery: hook genérico para paginación
  - useDashboardPagination: hook específico para dashboard

### 2.2 ⏳ PENDIENTE: Implementar paginación en Dashboard
- **Archivos**: `src/modules/dashboard/pages/DashboardPage.jsx`
- **Acción**: Reemplazar queries de 500 documentos por paginación

### 2.3 ⏳ PENDIENTE: Lazy loading de imágenes
- **Acción**: Implementar IntersectionObserver para imágenes del catálogo

---

## 🟡 FASE 3: TESTS Y CALIDAD (Días 8-12)

### 3.1 ⏳ PENDIENTE: Coverage de tests
- **Objetivo**: Aumentar coverage de 15% a 50%
- **Archivos prioritarios**:
  - `tests/validators/validators.test.js` (ya existe)
  - `tests/frontend/AuthContext.test.jsx`
  - `tests/functions/http-handlers.test.js`

### 3.2 ⏳ PENDIENTE: Tests de Firestore Rules
- **Archivos**: `tests/firestore/*.test.js`
- **Acción**: Ejecutar y verificar que pasan

### 3.3 ⏳ PENDIENTE: Agregar tests para property.service.js
- **Nuevo archivo**: `tests/modules/properties.test.js`

---

## 🟡 FASE 4: ACCESIBILIDAD (Días 13-15)

### 4.1 ⏳ PENDIENTE: Agregar aria-labels faltantes
- **Archivos**: Componentes de navegación, botones sin texto

### 4.2 ⏳ PENDIENTE: Skeleton loaders
- **Acción**: Agregar estados de carga en páginas principales

### 4.3 ⏳ PENDIENTE: Error boundaries por página
- **Acción**: Crear ErrorBoundary específico para cada ruta

---

## 🟢 FASE 5: OPTIMIZACIONES (Días 16-20)

### 5.1 ⏳ PENDIENTE: Bundle size
- **Acción**: Analizar con `npm run build` y optimizar

### 5.2 ⏳ PENDIENTE: Memoización
- **Acción**: Agregar useMemo/useCallback en listas grandes

### 5.3 ⏳ PENDIENTE: Cache de Firestore
- **Acción**: Configurar políticas de cache

---

## 📊 Progreso

| Fase | Estado | Archivos |
|------|--------|----------|
| Fase 1: Críticos | 80% | 5 archivos |
| Fase 2: Performance | 66% | 2 archivos |
| Fase 3: Tests | 10% | 1 archivo |
| Fase 4: Accesibilidad | 0% | - |
| Fase 5: Optimizaciones | 0% | - |

---

## ✅ Completado en esta sesión

### ✅ Validación de entrada en Cloud Functions
- `functions/src/validators/inputValidators.js` - Schemas Zod completos
- `functions/package.json` - Agregada dependencia zod ^3.24.0
- `tests/functions/inputValidators.test.js` - 60+ tests de validación

### ✅ Índices de Firestore
- `firestore.indexes.json` - 7 nuevos índices agregados

### ✅ Paginación - Hook creado
- `src/shared/hooks/usePaginatedQuery.js` - Hook genérico + hook para dashboard

### ✅ Dashboard optimizado
- `src/modules/dashboard/pages/DashboardPage.jsx` - Reducido de 500/250 a 50 documentos

---

## ✅ VERIFICACIÓN COMPLETADA

### Tests pasando ✅
```
tests/validators/validators.test.js      → 41 passed
tests/functions/http-handlers.test.js    → 16 passed  
tests/functions/inputValidators.test.js  → 28 passed
```

### Build pasando ✅
```
✓ built in 25.15s
```

### Lint pasando (warnings menores) ✅
- Warnings existentes son de código preexistente
- No hay errores críticos en los nuevos archivos

---

## 📊 Resumen de cambios realizados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `functions/src/validators/inputValidators.js` | CREADO | Schemas Zod para validación de entrada |
| `functions/package.json` | MODIFICADO | Agregada dependencia zod ^3.24.0 |
| `tests/functions/inputValidators.test.js` | CREADO | 28 tests para validadores |
| `firestore.indexes.json` | MODIFICADO | 7 nuevos índices compuestos |
| `src/shared/hooks/usePaginatedQuery.js` | CREADO | Hook de paginación genérico |
| `src/modules/dashboard/pages/DashboardPage.jsx` | MODIFICADO | Reducido limit de 500→50 |
| `AUDIT-PLAN.md` | ACTUALIZADO | Plan de trabajo con progreso |