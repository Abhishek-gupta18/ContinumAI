import { MemoryNode, SessionSummary } from '../types';

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError('Unable to reach the ContinumAI backend.', 0);
  }

  const body = await response.json().catch(() => null) as ApiErrorBody | T | null;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? body.error?.message || `Request failed with status ${response.status}.`
        : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

function mapBackendNode(backendNode: any): MemoryNode {
  const provider = backendNode.provider ?? null;
  const failed_providers = backendNode.failed_providers ?? [];
  const reply = backendNode.reply ?? null;
  const model_used = backendNode.model_used ?? 'unknown';
  const status_at_this_point = backendNode.status_at_this_point ?? 'done';
  const references = backendNode.references ?? null;
  const timestamp = backendNode.timestamp ?? new Date().toISOString();

  return {
    node_id: backendNode.node_id,
    prev_id: backendNode.prev_id,
    type: backendNode.type,
    content: backendNode.content ?? '',
    reply,
    model_used,
    status_at_this_point,
    timestamp,
    references,
    provider,
    failed_providers,
  };
}

export interface SessionsResponse {
  sessions: SessionSummary[];
}

export interface NodesResponse {
  session_id: string;
  nodes: MemoryNode[];
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  model_used: string;
  raw_provider_response: any;
}

export function getSessions(): Promise<SessionsResponse> {
  return request<SessionsResponse>('/sessions');
}

export function getSessionNodes(sessionId: string): Promise<NodesResponse> {
  return request<NodesResponse>(`/sessions/${encodeURIComponent(sessionId)}/nodes`).then((resp) => ({
    session_id: resp.session_id,
    nodes: resp.nodes.map(mapBackendNode),
  }));
}

export interface ProvidersResponse {
  providers: string[];
}

export function getProviders(): Promise<ProvidersResponse> {
  return request<ProvidersResponse>('/providers');
}

export function sendChat(sessionId: string, message: string, provider?: string): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(provider ? { session_id: sessionId, message, provider } : { session_id: sessionId, message }),
  });
}
