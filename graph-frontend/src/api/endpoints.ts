import { httpRequest, requestFull } from './http';
import type {
  ChatRequest,
  ChatResponse,
  Health,
  Me,
  MemoryNode,
  ProvidersResponse,
  ProviderKeyRowResponse,
  ProviderKeysResponse,
  ProviderOrderBody,
  PutProviderKeyBody,
  SessionNodesResponse,
  SessionsResponse,
} from './types';

export interface ChatResult {
  reply: string;
  model_used: string;
  /** Opaque provider data — never render it. */
  raw_provider_response: unknown;
  /** X-Memory-Saved: false means the reply was served but memory save failed. */
  memorySaved: boolean;
}

function mapBackendNode(backendNode: unknown): MemoryNode {
  const n = backendNode as Record<string, unknown>;
  return {
    node_id: String(n.node_id),
    prev_id: (n.prev_id as string | null) ?? null,
    session_id: String(n.session_id),
    type: ((n.type as string) ?? 'turn') as MemoryNode['type'],
    content: String(n.content ?? ''),
    reply: (n.reply as string | null) ?? null,
    model_used: String(n.model_used ?? 'unknown'),
    status_at_this_point: ((n.status_at_this_point as string) === 'blocked'
      ? 'blocked'
      : (n.status_at_this_point as string) === 'in_progress'
        ? 'in_progress'
        : 'done') as MemoryNode['status_at_this_point'],
    references: (n.references as string[] | null) ?? null,
    provider: (n.provider as string | null) ?? null,
    failed_providers: (n.failed_providers as string[]) ?? [],
    timestamp: String(n.timestamp ?? ''),
  };
}

// GET /health — no auth required.
export function getHealth(): Promise<Health> {
  return httpRequest<Health>('GET', '/health');
}

// GET /me
export function getMe(): Promise<Me> {
  return httpRequest<Me>('GET', '/me');
}

// GET /providers — names of the providers available to the signed-in account.
export function getProviders(): Promise<ProvidersResponse> {
  return httpRequest<ProvidersResponse>('GET', '/providers');
}

// POST /chat
export async function postChat(
  sessionId: string,
  message: string,
  provider?: string,
): Promise<ChatResult> {
  const body: ChatRequest = {
    session_id: sessionId,
    message,
    ...(provider ? { provider } : {}),
  };
  const { data, headers } = await requestFull<ChatResponse>('POST', '/chat', { body });
  return {
    reply: data.reply,
    model_used: data.model_used,
    raw_provider_response: data.raw_provider_response,
    memorySaved: headers.get('X-Memory-Saved') !== 'false',
  };
}

// GET /sessions
export function getSessions(): Promise<SessionsResponse> {
  return httpRequest<SessionsResponse>('GET', '/sessions');
}

// GET /sessions/:id/nodes
export async function getSessionNodes(sessionId: string): Promise<SessionNodesResponse> {
  const resp = await httpRequest<SessionNodesResponse>(
    'GET',
    `/sessions/${encodeURIComponent(sessionId)}/nodes`,
  );
  return { session_id: resp.session_id, nodes: resp.nodes.map(mapBackendNode) };
}

// GET /me/providers
export function getMyProviders(): Promise<ProviderKeysResponse> {
  return httpRequest<ProviderKeysResponse>('GET', '/me/providers');
}

// PUT /me/providers/:name
export function putMyProvider(
  name: string,
  body: PutProviderKeyBody,
): Promise<ProviderKeyRowResponse> {
  return httpRequest<ProviderKeyRowResponse>(
    'PUT',
    `/me/providers/${encodeURIComponent(name)}`,
    { body },
  );
}

// DELETE /me/providers/:name
export function deleteMyProvider(name: string): Promise<void> {
  return httpRequest<void>('DELETE', `/me/providers/${encodeURIComponent(name)}`);
}

// PUT /me/provider-order
export function putMyProviderOrder(order: string[]): Promise<ProviderKeysResponse> {
  const body: ProviderOrderBody = { order };
  return httpRequest<ProviderKeysResponse>('PUT', '/me/provider-order', { body });
}
