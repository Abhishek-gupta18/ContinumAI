import { ProviderConfig, FailoverEvent, ActivityLogRow, ApiKeyItem, FailoverPolicy, ProviderId } from '../types/dashboard';

export const PROVIDER_THEMES: Record<ProviderId, {
  name: string;
  color: string;
  bgSubtle: string;
  border: string;
  badgeBg: string;
  dotColor: string;
}> = {
  openai: {
    name: 'OpenAI',
    color: '#10B981', // emerald
    bgSubtle: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    dotColor: '#10B981',
  },
  gemini: {
    name: 'Google Gemini',
    color: '#3B82F6', // blue
    bgSubtle: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    dotColor: '#3B82F6',
  },
  claude: {
    name: 'Anthropic Claude',
    color: '#F97316', // orange
    bgSubtle: 'rgba(249, 115, 22, 0.1)',
    border: 'rgba(249, 115, 22, 0.3)',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    dotColor: '#F97316',
  },
  nvidia: {
    name: 'NVIDIA NIM',
    color: '#84CC16', // lime
    bgSubtle: 'rgba(132, 204, 22, 0.1)',
    border: 'rgba(132, 204, 22, 0.3)',
    badgeBg: 'rgba(132, 204, 22, 0.15)',
    dotColor: '#84CC16',
  },
  custom: {
    name: 'OpenAI-Compatible',
    color: '#8B5CF6', // gray-violet
    bgSubtle: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    dotColor: '#8B5CF6',
  },
};

export const INITIAL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'prov-openai-1',
    name: 'OpenAI Production',
    provider: 'openai',
    model: 'gpt-4o',
    maskedKey: 'sk-••••••••••a9F2',
    priority: 1,
    status: 'rate-limited',
    isEnabled: true,
    lastSuccess: '4m ago',
    successRate: 88.6,
    avgLatencyMs: 440,
    modelsAvailable: 18,
    createdAt: '2026-08-12T10:14:00Z',
  },
  {
    id: 'prov-gemini-2',
    name: 'Google Gemini Pro',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    maskedKey: 'AIza••••••••••7d9K',
    priority: 2,
    status: 'healthy',
    isEnabled: true,
    lastSuccess: '12s ago',
    successRate: 99.8,
    avgLatencyMs: 275,
    modelsAvailable: 12,
    createdAt: '2026-08-12T10:18:00Z',
  },
  {
    id: 'prov-claude-3',
    name: 'Anthropic Claude',
    provider: 'claude',
    model: 'claude-3-7-sonnet',
    maskedKey: 'sk-ant-••••••••••m3B1',
    priority: 3,
    status: 'healthy',
    isEnabled: true,
    lastSuccess: '1m ago',
    successRate: 99.4,
    avgLatencyMs: 510,
    modelsAvailable: 8,
    createdAt: '2026-08-14T09:22:00Z',
  },
  {
    id: 'prov-nvidia-4',
    name: 'NVIDIA NIM Cluster',
    provider: 'nvidia',
    model: 'meta/llama-3.3-70b-instruct',
    maskedKey: 'nvapi-••••••••••8xQ4',
    priority: 4,
    status: 'healthy',
    isEnabled: true,
    lastSuccess: '18m ago',
    successRate: 98.9,
    avgLatencyMs: 340,
    modelsAvailable: 24,
    createdAt: '2026-09-02T14:40:00Z',
  },
];

export const INITIAL_FAILOVERS: FailoverEvent[] = [
  {
    id: 'fo-1049',
    timestamp: '2m ago',
    fromProvider: 'openai',
    toProvider: 'gemini',
    errorCode: 'rate_limit_error',
    errorDescription: 'TPM threshold reached (30,000 / 30,000 tokens)',
    latencyMs: 1820,
    sessionId: 'sess-redis-failover',
    resolved: true,
  },
  {
    id: 'fo-1048',
    timestamp: '14m ago',
    fromProvider: 'openai',
    toProvider: 'gemini',
    errorCode: 'rate_limit_error',
    errorDescription: 'OpenAI 429: Too Many Requests on gpt-4o',
    latencyMs: 1410,
    sessionId: 'sess-sql-optimizer',
    resolved: true,
  },
  {
    id: 'fo-1047',
    timestamp: '48m ago',
    fromProvider: 'claude',
    toProvider: 'openai',
    errorCode: 'timeout',
    errorDescription: 'Socket read timeout after 30000ms',
    latencyMs: 31200,
    sessionId: 'sess-deep-colony-100',
    resolved: true,
  },
  {
    id: 'fo-1046',
    timestamp: '2h ago',
    fromProvider: 'openai',
    toProvider: 'claude',
    errorCode: 'rate_limit_error',
    errorDescription: 'OpenAI rate limit tier reached',
    latencyMs: 1950,
    sessionId: 'sess-auth-rewrite',
    resolved: true,
  },
];

export const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: 'key-prod-master',
    name: 'Production Gateway Key',
    prefix: 'cnt_live_4f92••••••••••••',
    createdAt: '2026-08-15',
    lastUsedAt: '4s ago',
    status: 'active',
    rateLimitReqSec: 100,
  },
  {
    id: 'key-dev-local',
    name: 'Local Dev Environment',
    prefix: 'cnt_test_81a0••••••••••••',
    createdAt: '2026-09-01',
    lastUsedAt: '24m ago',
    status: 'active',
    rateLimitReqSec: 25,
  },
  {
    id: 'key-staging-ci',
    name: 'CI/CD Staging Cluster',
    prefix: 'cnt_test_3c17••••••••••••',
    createdAt: '2026-09-10',
    lastUsedAt: '2d ago',
    status: 'active',
    rateLimitReqSec: 50,
  },
  {
    id: 'key-old-deprecated',
    name: 'Legacy v1 Gateway Worker',
    prefix: 'cnt_live_90e4••••••••••••',
    createdAt: '2026-07-20',
    lastUsedAt: '18d ago',
    status: 'revoked',
    rateLimitReqSec: 50,
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogRow[] = [
  {
    id: 'act-9921',
    timestamp: 'Just now',
    sessionId: 'sess-redis-failover',
    providerChain: [
      { provider: 'openai', status: 'failed', code: 429, latencyMs: 320, errorReason: 'rate_limit_error: TPM quota exceeded' },
      { provider: 'gemini', status: 'ok', code: 200, latencyMs: 640 },
    ],
    finalModel: 'gemini-2.5-flash',
    statusCode: 200,
    latencyMs: 960,
    tokensPrompt: 1420,
    tokensCompletion: 380,
    errorClassification: 'Auto-mitigated rate limit; state checkpoint preserved in shared memory.',
    checkpointId: 'cp-redis-cutover',
  },
  {
    id: 'act-9920',
    timestamp: '3m ago',
    sessionId: 'sess-auth-rewrite',
    providerChain: [
      { provider: 'openai', status: 'ok', code: 200, latencyMs: 410 },
    ],
    finalModel: 'gpt-4o',
    statusCode: 200,
    latencyMs: 410,
    tokensPrompt: 890,
    tokensCompletion: 210,
  },
  {
    id: 'act-9919',
    timestamp: '6m ago',
    sessionId: 'sess-sql-optimizer',
    providerChain: [
      { provider: 'openai', status: 'failed', code: 429, latencyMs: 290, errorReason: 'rate_limit_error' },
      { provider: 'gemini', status: 'ok', code: 200, latencyMs: 510 },
    ],
    finalModel: 'gemini-2.5-flash',
    statusCode: 200,
    latencyMs: 800,
    tokensPrompt: 2410,
    tokensCompletion: 760,
    errorClassification: 'Primary provider 429; continuous context handed over without dropped prompt tokens.',
  },
  {
    id: 'act-9918',
    timestamp: '11m ago',
    sessionId: 'sess-deep-colony-100',
    providerChain: [
      { provider: 'claude', status: 'ok', code: 200, latencyMs: 540 },
    ],
    finalModel: 'claude-3-7-sonnet',
    statusCode: 200,
    latencyMs: 540,
    tokensPrompt: 3820,
    tokensCompletion: 1140,
  },
  {
    id: 'act-9917',
    timestamp: '22m ago',
    sessionId: 'sess-redis-failover',
    providerChain: [
      { provider: 'openai', status: 'failed', code: 429, latencyMs: 310, errorReason: 'rate_limit_error' },
      { provider: 'gemini', status: 'failed', code: 504, latencyMs: 2100, errorReason: 'upstream_gateway_timeout' },
      { provider: 'claude', status: 'ok', code: 200, latencyMs: 820 },
    ],
    finalModel: 'claude-3-7-sonnet',
    statusCode: 200,
    latencyMs: 3230,
    tokensPrompt: 4190,
    tokensCompletion: 920,
    errorClassification: 'Multi-hop failover: OpenAI -> Gemini -> Claude successfully completed turn.',
    checkpointId: 'cp-colony-2',
  },
  {
    id: 'act-9916',
    timestamp: '35m ago',
    sessionId: 'sess-auth-rewrite',
    providerChain: [
      { provider: 'nvidia', status: 'ok', code: 200, latencyMs: 360 },
    ],
    finalModel: 'meta/llama-3.3-70b-instruct',
    statusCode: 200,
    latencyMs: 360,
    tokensPrompt: 1120,
    tokensCompletion: 440,
  },
  {
    id: 'act-9915',
    timestamp: '1h ago',
    sessionId: 'sess-sql-optimizer',
    providerChain: [
      { provider: 'openai', status: 'ok', code: 200, latencyMs: 420 },
    ],
    finalModel: 'gpt-4o',
    statusCode: 200,
    latencyMs: 420,
    tokensPrompt: 1850,
    tokensCompletion: 510,
  },
];

export const INITIAL_FAILOVER_POLICY: FailoverPolicy = {
  failoverOnAuthError: true,
  perProviderTimeoutMs: 30000,
  strategy: 'priority',
  maxRetries: 3,
  quarantineSeconds: 60,
};

export const REQUESTS_BY_MODEL_DATA = [
  { provider: 'gemini' as ProviderId, name: 'Google Gemini', requests: 18450, percentage: 43.1, color: '#3B82F6' },
  { provider: 'openai' as ProviderId, name: 'OpenAI', requests: 14220, percentage: 33.2, color: '#10B981' },
  { provider: 'claude' as ProviderId, name: 'Anthropic Claude', requests: 7410, percentage: 17.3, color: '#F97316' },
  { provider: 'nvidia' as ProviderId, name: 'NVIDIA NIM', requests: 2770, percentage: 6.4, color: '#84CC16' },
];
