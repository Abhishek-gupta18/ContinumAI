import { MemoryNode, Session, SessionSummary } from '../types';

/**
 * Pure conversion from the API contract to the `Session` shape the graph
 * components consume (GraphView, ColonyCanvasView, inspectors).
 *
 * API:   GET /sessions          -> { sessions: SessionSummary[] }
 *        GET /sessions/:id/nodes -> { session_id, nodes: MemoryNode[] }
 * Graph: Session { id, title, description, updatedAt, status, nodes }
 *
 * Derived fields the API does not carry:
 * - status:      from the last node (blocked / in_progress -> active / done -> completed)
 * - updatedAt:   summary.latest_activity, falling back to the last node's timestamp
 * - description: the API has no such field; left empty (no mock text)
 *
 * No IO, no mutation, no React — same inputs always produce the same output.
 */
export function toGraphSession(
  summary: SessionSummary | null,
  nodes: MemoryNode[],
): Session {
  const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
  const status: Session['status'] =
    lastNode?.status_at_this_point === 'blocked'
      ? 'blocked'
      : lastNode?.status_at_this_point === 'in_progress'
        ? 'active'
        : 'completed';

  return {
    id: summary?.id ?? '',
    title: summary?.title || summary?.id || 'Untitled session',
    description: '',
    updatedAt: summary?.latest_activity ?? lastNode?.timestamp ?? '',
    status,
    nodes,
  };
}
