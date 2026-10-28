export type MemoryNodeType = 'turn' | 'decision' | 'checkpoint';

export type NodeStatus = 'in_progress' | 'blocked' | 'done';

export type ModelUsed = string;

export interface MemoryNode {
  node_id: string;
  prev_id: string | null;
  type: MemoryNodeType;
  content: string;
  reply?: string | null;
  model_used: string; // Plain string as requested (e.g. 'openai', 'gemini', 'claude', 'gpt', 'openrouter')
  status_at_this_point: NodeStatus;
  timestamp: string;
  provider?: string | null;
  failed_providers?: string[];
  references?: string[]; // present on decision nodes
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
  title: string;
  description: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'blocked';
  nodes: MemoryNode[];
}
