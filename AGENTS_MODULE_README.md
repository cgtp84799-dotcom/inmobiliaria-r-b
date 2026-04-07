# Módulo de Agentes — Bloque 2

## Archivos creados

### Core / Config
- `src/core/config/routes.config.js` — añade `AGENTS` y `AGENT_DETAIL`

### Types
- `src/modules/users/types/user.types.js` — añade rol `AGENT` con permisos completos, `ROLE_PERMISSIONS`, `hasPermission`, `canManageUser`

### Hook
- `src/modules/agents/hooks/useAgentStats.js` — suscripción onSnapshot a `visits`, `contracts` y `users` en tiempo real. Calcula 12+ métricas derivadas, sparkline semanal, datos mensuales para gráfica y feed de actividad reciente

### Componentes
- `src/modules/agents/components/AgentCard.jsx` — tarjeta compacta: avatar, rol, KPIs 2×2, revenue, sparkline SVG inline, link a detalle
- `src/modules/agents/components/AgentActivityFeed.jsx` — timeline de actividad (visitas + contratos), con `getTimeAgo`, íconos de estado, animación de entrada con Framer Motion
- `src/modules/agents/components/AgentPerformanceChart.jsx` — gráfica de barras dobles por mes (SVG puro), animada con Framer Motion

### Páginas
- `src/modules/agents/pages/AgentsPage.jsx` — panel global: KPIs del equipo, ranking top 3, buscador, grid de AgentCard
- `src/modules/agents/pages/AgentDetailPage.jsx` — perfil completo: header con conversión destacada, 6 KPIs, gráfica + feed, desglose por estado

### Barrel
- `src/modules/agents/index.js` — exports centralizados del módulo

---

## Pasos para integrar (si no están ya aplicados)

### 1. Sidebar — agregar ítem Agentes

```jsx
// src/shared/components/Sidebar.jsx (o donde esté el sidebar)
// Agregar en el array de navItems, visible solo para admin:

import { FaUsers } from 'react-icons/fa';
import { PRIVATE_ROUTES } from '../../core/config/routes.config';

// Dentro del array de items:
{
  to:    PRIVATE_ROUTES.AGENTS,
  icon:  FaUsers,
  label: 'Agentes',
  roles: ['admin'],  // o la lógica de permisos que uses
},
```

### 2. App.jsx — registrar rutas

```jsx
import { lazy } from 'react';
import { PRIVATE_ROUTES } from './core/config/routes.config';

const AgentsPage      = lazy(() => import('./modules/agents/pages/AgentsPage'));
const AgentDetailPage = lazy(() => import('./modules/agents/pages/AgentDetailPage'));

// Dentro del bloque de rutas privadas:
<Route path={PRIVATE_ROUTES.AGENTS}       element={<AgentsPage />} />
<Route path={PRIVATE_ROUTES.AGENT_DETAIL} element={<AgentDetailPage />} />
```

### 3. Firestore — campos requeridos

Para que las métricas funcionen, cada documento de `visits` y `contracts` debe incluir:

```js
// visits
{
  agentEmail: 'agente@email.com',  // ← campo clave para el filtro
  agentName:  'Nombre Apellido',
  agentId:    'uid-del-agente',    // ← alternativo al email
  // ... otros campos existentes
}

// contracts
{
  agentEmail: 'agente@email.com',
  agentName:  'Nombre Apellido',
  agentId:    'uid-del-agente',
  // ... otros campos existentes
}
```

> Si los documentos existentes no tienen `agentEmail`, las métricas por agente específico mostrarán ceros. Agrega el campo en `VisitForm` y `ContractForm` al momento de crear.

### 4. Índices Firestore requeridos

Crear en Firebase Console → Firestore → Índices:

| Colección | Campo 1       | Campo 2       | Orden |
|-----------|--------------|--------------|-------|
| visits    | agentEmail   | createdAt     | DESC  |
| contracts | agentEmail   | createdAt     | DESC  |

---

## Próximos pasos (Bloque 3)

- Módulo de Clientes completo (`ClientsPage`, `ClientDetail`, `ClientPortal`, `useFavorites`)
- Conectar corazones en `PropertyCard` con Firestore
- Control de asignación de agente en `VisitForm` y `ContractForm`
