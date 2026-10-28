export type ProviderId = 'openai' | 'gemini' | 'claude' | 'nvidia' | 'custom';

export type ProviderStatus = 'healthy' | 'rate-limited' | 'auth-error' | 'timeout' | 'disabled';

export interface ProviderConfig {
  id: string;
  name: string;
  provider: ProviderId;
  model: string;
  maskedKey: string; // e.g. "sk-••••••••••a9F2"
  priority: number;
  status: ProviderStatus;
  isEnabled: boolean;
  lastSuccess: string;
  successRate: number; // e.g. 99.4
  avgLatencyMs: number;
  modelsAvailable: number;
  customBaseUrl?: string;
  modelOverride?: string;
  createdAt: string;
}

export interface FailoverEvent {
  id: string;
  timestamp: string;
  fromProvider: ProviderId;
  toProvider: ProviderId;
  errorCode: string; // e.g. 'rate_limit_error' | 'timeout' | 'auth_error'
  errorDescription: string;
  latencyMs: number;
  sessionId: string;
  resolved: boolean;
}

export interface ActivityLogRow {
  id: string;
  timestamp: string;
  sessionId: string;
  providerChain: {
    provider: ProviderId;
    status: 'ok' | 'failed';
    code: number;
    latencyMs: number;
    errorReason?: string;
  }[];
  finalModel: string;
  statusCode: number;
  latencyMs: number;
  tokensPrompt: number;
  tokensCompletion: number;
  errorClassification?: string;
  checkpointId?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string; // e.g. "cnt_live_a1b2..."
  createdAt: string;
  lastUsedAt: string;
  status: 'active' | 'revoked';
  rateLimitReqSec: number;
}

export interface FailoverPolicy {
  failoverOnAuthError: boolean;
  perProviderTimeoutMs: number;
  strategy: 'priority' | 'latency-weighted';
  maxRetries: number;
  quarantineSeconds: number;
}
