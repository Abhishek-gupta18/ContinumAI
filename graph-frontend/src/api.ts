import { Session, MemoryNode } from './types';
import { MOCK_SESSIONS } from './data/mockSessions';

export interface ProviderKeyConfig {
  id: string; // 'openai' | 'gemini' | 'claude' | 'openrouter'
  name: string;
  description: string;
  maskedKey: string | null; // e.g. "sk-…a1b2", NEVER the full key!
  status: 'connected' | 'invalid' | 'rate_limited' | 'not_set';
  enabled: boolean;
  priority: number;
  defaultModel: string;
  availableModels: string[];
  lastTestedAt?: string;
  latencyMs?: number;
}

export interface GatewayToken {
  id: string;
  name: string;
  maskedToken: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// In-memory sessions store (initialized from MOCK_SESSIONS)
let inMemorySessions: Session[] = JSON.parse(JSON.stringify(MOCK_SESSIONS));

// In-memory provider configurations (keys are NEVER persisted to localStorage or bundle)
let inMemoryKeys: ProviderKeyConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, o1 reasoning models with function calling and JSON mode',
    maskedKey: 'sk-proj-…8e3b',
    status: 'connected',
    enabled: true,
    priority: 1,
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    lastTestedAt: '2026-10-17T11:45:00Z',
    latencyMs: 142,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 1.5 Pro and 1.5 Flash with 2M token context window and high throughput',
    maskedKey: 'AIzaSy…9k12',
    status: 'connected',
    enabled: true,
    priority: 2,
    defaultModel: 'gemini-1.5-pro',
    availableModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    lastTestedAt: '2026-10-17T11:50:00Z',
    latencyMs: 88,
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet and Haiku with deep reasoning, coding capabilities, and artifact generation',
    maskedKey: 'sk-ant-…4d71',
    status: 'connected',
    enabled: true,
    priority: 3,
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    lastTestedAt: '2026-10-17T11:55:00Z',
    latencyMs: 165,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Unified Gateway',
    description: 'Universal fallback aggregator routing to 200+ models with dynamic price/performance arbitrage',
    maskedKey: null,
    status: 'not_set',
    enabled: false,
    priority: 4,
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    availableModels: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat', 'mistralai/mistral-large-2407'],
  },
];

// In-memory gateway tokens
let inMemoryTokens: GatewayToken[] = [
  {
    id: 'tok_live_01',
    name: 'Production Kubernetes Cluster',
    maskedToken: 'ctm_live_…f9a2',
    createdAt: '2026-09-20T14:30:00Z',
    lastUsedAt: '2026-10-17T12:02:11Z',
  },
  {
    id: 'tok_live_02',
    name: 'Local CLI & CI/CD Runner',
    maskedToken: 'ctm_live_…3c18',
    createdAt: '2026-10-02T09:15:00Z',
    lastUsedAt: '2026-10-17T11:40:00Z',
  },
];

/* =========================================================================
   SESSION & GRAPH API
   ========================================================================= */

export async function listSessions(): Promise<Session[]> {
  await new Promise((r) => setTimeout(r, 60));
  return inMemorySessions;
}

export async function getGraph(
  id: string
): Promise<{ id: string; title: string; nodes: MemoryNode[] } | null> {
  await new Promise((r) => setTimeout(r, 40));
  const s = inMemorySessions.find((sess) => sess.id === id);
  if (!s) return null;
  return {
    id: s.id,
    title: s.title,
    nodes: s.nodes,
  };
}

export async function createSession(initialTitle?: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 80));
  const newId = `session-${Date.now().toString(36)}`;
  const rootNodeId = `node-${Date.now().toString(36)}-0`;
  const rootNode: MemoryNode = {
    node_id: rootNodeId,
    prev_id: null,
    type: 'turn',
    content: initialTitle || 'Session initialized. Ready to execute multi-model arbitration tasks.',
    reply: 'ContinumAI gateway ready. Memory chain active across all configured providers.',
    model_used: 'gemini',
    status_at_this_point: 'done',
    timestamp: new Date().toISOString(),
  };

  const newSession: Session = {
    id: newId,
    title: initialTitle ? initialTitle.slice(0, 60) : 'New Autonomous Task',
    description: 'Shared memory session with real-time failover tracking',
    updatedAt: new Date().toISOString(),
    status: 'active',
    nodes: [rootNode],
  };

  inMemorySessions = [newSession, ...inMemorySessions];
  return newSession;
}

export async function renameSession(id: string, newTitle: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 40));
  inMemorySessions = inMemorySessions.map((s) =>
    s.id === id ? { ...s, title: newTitle.trim().slice(0, 60), updatedAt: new Date().toISOString() } : s
  );
}

export async function deleteSession(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 50));
  inMemorySessions = inMemorySessions.filter((s) => s.id !== id);
}

/* =========================================================================
   CHAT COMPOSER API (With Autonomous Failover Simulation)
   ========================================================================= */

export async function sendChat(
  sessionId: string,
  userMessage: string,
  options?: {
    forceFailover?: boolean;
    providerPreference?: string;
  }
): Promise<{ node: MemoryNode; session: Session }> {
  await new Promise((r) => setTimeout(r, 220));

  const sessionIndex = inMemorySessions.findIndex((s) => s.id === sessionId);
  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const session = inMemorySessions[sessionIndex];
  const lastNode = session.nodes.length > 0 ? session.nodes[session.nodes.length - 1] : null;

  // Determine provider through priority & failover check
  const enabledProviders = inMemoryKeys
    .filter((k) => k.enabled && k.status !== 'not_set')
    .sort((a, b) => a.priority - b.priority);

  const shouldFailover =
    options?.forceFailover ||
    userMessage.toLowerCase().includes('failover') ||
    userMessage.toLowerCase().includes('rate limit') ||
    userMessage.toLowerCase().includes('benchmark');

  let chosenProvider = 'gemini';
  let failedProviders: string[] | undefined = undefined;

  if (shouldFailover) {
    failedProviders = ['openai'];
    // Fallback to secondary provider
    chosenProvider = enabledProviders.find((p) => p.id !== 'openai')?.id || 'gemini';
  } else if (enabledProviders.length > 0) {
    chosenProvider = options?.providerPreference || enabledProviders[0].id;
  }

  // Realistic mock replies
  let simulatedReply = '';
  if (shouldFailover) {
    simulatedReply = `[Failover Handled via ContinumAI Gateway]\nPrimary provider 'openai' returned HTTP 429 Too Many Requests (Rate limit threshold exceeded). Gateway auto-switched to ${chosenProvider.toUpperCase()} in 34ms.\n\nMemory context verified (100% token preservation). Executed instruction: "${userMessage}". Output stream completed cleanly with status 200.`;
  } else {
    simulatedReply = `Processed successfully by ${chosenProvider.toUpperCase()}.\n\nContext evaluation complete: verified against previous ${session.nodes.length} memory turns. State parameters aligned and checkpoint integrity preserved.`;
  }

  const newNodeId = `node-${session.nodes.length + 1}-${Math.random().toString(36).substring(2, 6)}`;
  const newNode: MemoryNode = {
    node_id: newNodeId,
    prev_id: lastNode ? lastNode.node_id : null,
    type: 'turn',
    content: userMessage,
    reply: simulatedReply,
    model_used: chosenProvider,
    status_at_this_point: 'done',
    timestamp: new Date().toISOString(),
    ...(failedProviders ? { failed_providers: failedProviders } : {}),
  };

  const updatedNodes = [...session.nodes, newNode];
  const updatedSession: Session = {
    ...session,
    nodes: updatedNodes,
    updatedAt: new Date().toISOString(),
  };

  inMemorySessions[sessionIndex] = updatedSession;

  return { node: newNode, session: updatedSession };
}

/* =========================================================================
   PROVIDER KEYS API (Write-Only, Never Persisted to Storage)
   ========================================================================= */

export async function listKeys(): Promise<ProviderKeyConfig[]> {
  await new Promise((r) => setTimeout(r, 60));
  return inMemoryKeys;
}

export async function saveKey(
  providerId: string,
  secretKey: string,
  defaultModel?: string
): Promise<ProviderKeyConfig> {
  await new Promise((r) => setTimeout(r, 120));

  if (!secretKey || secretKey.trim().length < 8) {
    throw new Error('Key must be at least 8 characters long');
  }

  // Mask the key: WRITE-ONLY. Secret is immediately discarded!
  const trimmed = secretKey.trim();
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  const maskedKey = `${prefix}…${suffix}`;

  inMemoryKeys = inMemoryKeys.map((item) => {
    if (item.id === providerId) {
      return {
        ...item,
        maskedKey,
        status: 'connected',
        enabled: true,
        defaultModel: defaultModel || item.defaultModel,
        lastTestedAt: new Date().toISOString(),
        latencyMs: Math.floor(70 + Math.random() * 90),
      };
    }
    return item;
  });

  const updated = inMemoryKeys.find((k) => k.id === providerId)!;
  return updated;
}

export async function deleteKey(providerId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 80));
  inMemoryKeys = inMemoryKeys.map((item) => {
    if (item.id === providerId) {
      return {
        ...item,
        maskedKey: null,
        status: 'not_set',
        enabled: false,
        lastTestedAt: undefined,
        latencyMs: undefined,
      };
    }
    return item;
  });
}

export async function testKey(
  providerId: string
): Promise<{ status: ProviderKeyConfig['status']; latencyMs: number }> {
  await new Promise((r) => setTimeout(r, 350));
  const latency = Math.floor(65 + Math.random() * 85);

  inMemoryKeys = inMemoryKeys.map((item) => {
    if (item.id === providerId) {
      return {
        ...item,
        status: 'connected',
        lastTestedAt: new Date().toISOString(),
        latencyMs: latency,
      };
    }
    return item;
  });

  return { status: 'connected', latencyMs: latency };
}

export async function updateKeyOrder(orderedIds: string[]): Promise<ProviderKeyConfig[]> {
  await new Promise((r) => setTimeout(r, 50));
  inMemoryKeys = inMemoryKeys
    .map((item) => {
      const idx = orderedIds.indexOf(item.id);
      return { ...item, priority: idx !== -1 ? idx + 1 : 99 };
    })
    .sort((a, b) => a.priority - b.priority);

  return inMemoryKeys;
}

export async function toggleKeyEnabled(
  providerId: string,
  enabled: boolean
): Promise<ProviderKeyConfig> {
  await new Promise((r) => setTimeout(r, 40));
  inMemoryKeys = inMemoryKeys.map((item) =>
    item.id === providerId ? { ...item, enabled } : item
  );
  return inMemoryKeys.find((k) => k.id === providerId)!;
}

export async function updateProviderModel(
  providerId: string,
  defaultModel: string
): Promise<ProviderKeyConfig> {
  await new Promise((r) => setTimeout(r, 40));
  inMemoryKeys = inMemoryKeys.map((item) =>
    item.id === providerId ? { ...item, defaultModel } : item
  );
  return inMemoryKeys.find((k) => k.id === providerId)!;
}

/* =========================================================================
   GATEWAY TOKENS API
   ========================================================================= */

export async function listTokens(): Promise<GatewayToken[]> {
  await new Promise((r) => setTimeout(r, 60));
  return inMemoryTokens;
}

export async function createToken(
  name: string
): Promise<{ token: GatewayToken; secretKey: string }> {
  await new Promise((r) => setTimeout(r, 120));
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const secretKey = `ctm_live_${randomSuffix}_${Date.now().toString(36)}`;
  const maskedToken = `ctm_live_…${secretKey.slice(-4)}`;

  const token: GatewayToken = {
    id: `tok_${Date.now().toString(36)}`,
    name: name.trim() || 'API Token',
    maskedToken,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  inMemoryTokens = [token, ...inMemoryTokens];
  return { token, secretKey };
}

export async function revokeToken(tokenId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 60));
  inMemoryTokens = inMemoryTokens.filter((t) => t.id !== tokenId);
}
