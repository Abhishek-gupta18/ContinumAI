// Types mirrored from graph-frontend/API_CONTRACT.md (extracted from the
// backend code). No invented fields.

export interface Me {
  id: string | null;
  source: 'supabase' | 'legacy';
}

export interface Health {
  status: 'ok';
}

export interface SessionSummary {
  id: string;
  node_count: number;
  latest_activity: string | null;
  models: string[];
  title: string;
}

export interface SessionsResponse {
  sessions: SessionSummary[];
}

export interface MemoryNode {
  node_id: string;
  prev_id: string | null;
  session_id: string;
  type: 'turn' | 'decision' | 'checkpoint';
  content: string;
  reply: string | null;
  model_used: string;
  status_at_this_point: 'in_progress' | 'blocked' | 'done';
  references: string[] | null;
  provider: string | null;
  failed_providers: string[];
  timestamp: string;
}

export interface SessionNodesResponse {
  session_id: string;
  nodes: MemoryNode[];
}

export interface ChatRequest {
  session_id: string;
  message: string;
  provider?: string;
}

export interface ChatResponse {
  reply: string;
  model_used: string;
  /** Opaque provider data — never render it. */
  raw_provider_response: unknown;
}

export interface ProvidersResponse {
  providers: string[];
}

export type ProviderKind = 'openai' | 'gemini' | 'claude' | 'nvidia' | 'openai_compat';

export interface ProviderKeyRow {
  name: string;
  kind: ProviderKind;
  label: string;
  model: string;
  base_url: string | null;
  key_last4: string;
  priority: number;
  enabled: boolean;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderKeyRowResponse {
  provider: ProviderKeyRow;
}

export interface ProviderKeysResponse {
  providers: ProviderKeyRow[];
}

export interface PutProviderKeyBody {
  kind: ProviderKind;
  label?: string;
  model?: string;
  base_url?: string;
  priority?: number;
  enabled?: boolean;
  api_key?: string;
}

export interface ProviderOrderBody {
  order: string[];
}
