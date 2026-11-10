import { ApiError } from '../../api/http';
import type { MemoryNode, SessionSummary } from '../../api/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'failed';
  text: string;
  model?: string;
  provider?: string | null;
  failedProviders?: string[];
}

/**
 * Session ids must match the server rule /^[A-Za-z0-9_-]{1,64}$/.
 * Default: "s" + a UUID with dashes removed, cut to 24 characters.
 */
export function newSessionId(
  random: () => string = newSessionIdDefaultRandom,
): string {
  const candidate = `s${random().replace(/-/g, '')}`.slice(0, 24);
  if (
    /^[A-Za-z0-9_-]{1,64}$/.test(candidate) &&
    // A collapsed candidate ("s") would collide every session; regenerate.
    (random === newSessionIdDefaultRandom || candidate.length > 1)
  ) {
    return candidate;
  }
  // Custom random produced something invalid; fall back to the default.
  return newSessionId();
}

const newSessionIdDefaultRandom = () => crypto.randomUUID();

export function validateMessage(text: string): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'Type a message first.' };
  return { ok: true, text: trimmed };
}

export function sortSessions<T extends { id: string; latest_activity: string | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.latest_activity === null && b.latest_activity === null) return a.id.localeCompare(b.id);
    if (a.latest_activity === null) return 1;
    if (b.latest_activity === null) return -1;
    return b.latest_activity.localeCompare(a.latest_activity) || a.id.localeCompare(b.id);
  });
}

export function nodesToMessages(nodes: MemoryNode[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const node of nodes) {
    if (node.type !== 'turn') continue;
    out.push({ id: `${node.node_id}-user`, role: 'user', text: node.content });
    if (node.status_at_this_point === 'done' && node.reply !== null) {
      out.push({
        id: `${node.node_id}-assistant`,
        role: 'assistant',
        text: node.reply,
        model: node.model_used,
        provider: node.provider,
        failedProviders: node.failed_providers,
      });
    } else if (
      node.status_at_this_point === 'blocked' ||
      (node.status_at_this_point === 'done' && node.reply === null)
    ) {
      out.push({
        id: `${node.node_id}-failed`,
        role: 'failed',
        text: 'No provider could answer this message.',
        failedProviders: node.failed_providers,
      });
    }
    // Any other status (e.g. 'in_progress') = the turn is still being answered;
    // no second message yet.
  }
  return out;
}

export interface ChatError {
  message: string;
  action?: 'add_key' | 'retry';
}

export function describeChatError(err: unknown): ChatError {
  if (!(err instanceof ApiError)) {
    return { message: err instanceof Error ? err.message : String(err) };
  }
  switch (err.type) {
    case 'no_providers':
      return { message: 'No provider keys are set up for this account.', action: 'add_key' };
    case 'providers_unavailable':
      return { message: 'Provider settings are temporarily unavailable.', action: 'retry' };
    case 'memory_unavailable':
      return { message: 'Conversation memory is unavailable. Nothing was sent.', action: 'retry' };
    case 'timeout':
      return { message: 'The providers took too long to answer.', action: 'retry' };
    case 'network':
      return { message: 'Cannot reach the ContinumAI gateway.', action: 'retry' };
    case 'unauthorized':
      return { message: 'Your session has expired.' };
    default:
      return { message: err.message };
  }
}
