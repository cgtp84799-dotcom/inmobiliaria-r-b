/**
 * Barrel de exportaciones del módulo de Agentes.
 * Importa siempre desde aquí, no directamente de los archivos internos.
 */
export { default as AgentsPage }       from './pages/AgentsPage';
export { default as AgentDetailPage }  from './pages/AgentDetailPage';
export { useAgentStats }               from './hooks/useAgentStats';
export { default as AgentCard }        from './components/AgentCard';
export { default as AgentActivityFeed } from './components/AgentActivityFeed';
export { default as AgentPerformanceChart } from './components/AgentPerformanceChart';