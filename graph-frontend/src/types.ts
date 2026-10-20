export type MemoryNodeType = 'turn' | 'decision' | 'checkpoint';

export type ModelUsed = string;

export type NodeStatus = 'in_progress' | 'done' | 'blocked';

export interface MemoryNode {
  node_id: string;
  prev_id: string | null;
  type: MemoryNodeType;
  content: string;
  reply?: string | null;
  model_used: ModelUsed;
  status_at_this_point: NodeStatus;
  timestamp: string;
  references?: string[] | null;
  provider?: string | null;
  failed_providers?: string[];
}

export interface SessionSummary {
  id: string;
  node_count: number;
  latest_activity: string | null;
  models: string[];
  title: string;
}

export interface Session {
  id: string;
  nodes: MemoryNode[];
  node_count?: number;
  latest_activity?: string | null;
  models?: string[];
  title?: string;
  description?: string;
  updatedAt?: string;
  status?: 'active' | 'completed' | 'blocked';
}
