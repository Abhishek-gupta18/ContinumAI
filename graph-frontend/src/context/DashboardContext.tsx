import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ProviderConfig,
  FailoverEvent,
  ActivityLogRow,
  ApiKeyItem,
  FailoverPolicy,
  ProviderId,
} from '../types/dashboard';
import {
  INITIAL_PROVIDERS,
  INITIAL_FAILOVERS,
  INITIAL_API_KEYS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_FAILOVER_POLICY,
} from '../data/dashboardData';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface DashboardContextType {
  // Providers
  providers: ProviderConfig[];
  addProvider: (data: Omit<ProviderConfig, 'id' | 'createdAt' | 'lastSuccess' | 'successRate' | 'avgLatencyMs'>) => void;
  updateProvider: (id: string, partial: Partial<ProviderConfig>) => void;
  deleteProvider: (id: string) => void;
  toggleProvider: (id: string) => void;
  moveProviderPriority: (id: string, direction: 'up' | 'down') => void;
  testProvider: (id: string) => Promise<{ success: boolean; latencyMs: number; modelsCount: number; message: string }>;

  // Failovers & Activities
  failovers: FailoverEvent[];
  activityLogs: ActivityLogRow[];
  simulateFailover: (from: ProviderId, to: ProviderId, reason: string) => void;

  // API Keys
  apiKeys: ApiKeyItem[];
  createApiKey: (name: string) => { fullKey: string; item: ApiKeyItem };
  revokeApiKey: (id: string) => void;

  // Policy
  failoverPolicy: FailoverPolicy;
  updatePolicy: (partial: Partial<FailoverPolicy>) => void;

  // Selected Session for Graph & Playground
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;

  // UI state
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isAddProviderModalOpen: boolean;
  setIsAddProviderModalOpen: (open: boolean) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Global metrics
  metrics: {
    requests24h: number;
    failovers24h: number;
    avgLatencyMs: number;
    activeSessions: number;
    healthyCount: number;
    totalProviders: number;
  };
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [providers, setProviders] = useState<ProviderConfig[]>(INITIAL_PROVIDERS);
  const [failovers, setFailovers] = useState<FailoverEvent[]>(INITIAL_FAILOVERS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>(INITIAL_ACTIVITY_LOGS);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_API_KEYS);
  const [failoverPolicy, setFailoverPolicy] = useState<FailoverPolicy>(INITIAL_FAILOVER_POLICY);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('session-redis-failover');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = (msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast = { ...msg, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, msg.duration || 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addProvider = (data: Omit<ProviderConfig, 'id' | 'createdAt' | 'lastSuccess' | 'successRate' | 'avgLatencyMs'>) => {
    const newId = `prov-${data.provider}-${Date.now().toString(36)}`;
    const newProvider: ProviderConfig = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
      lastSuccess: 'Just added',
      successRate: 100,
      avgLatencyMs: 310,
    };
    // Reorder priorities if needed
    const updated = [...providers, newProvider].sort((a, b) => a.priority - b.priority);
    setProviders(updated);
    addToast({
      type: 'success',
      title: 'Provider added',
      description: `${data.name} is now in your gateway priority chain at position #${data.priority}.`,
    });
  };

  const updateProvider = (id: string, partial: Partial<ProviderConfig>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...partial } : p))
    );
    addToast({
      type: 'info',
      title: 'Provider updated',
      description: 'Your configuration changes have been applied.',
    });
  };

  const deleteProvider = (id: string) => {
    const item = providers.find((p) => p.id === id);
    setProviders((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((p, idx) => ({ ...p, priority: idx + 1 }));
    });
    addToast({
      type: 'warning',
      title: 'Provider removed',
      description: item ? `${item.name} was removed from the gateway chain.` : 'Provider deleted.',
    });
  };

  const toggleProvider = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextState = !p.isEnabled;
          return {
            ...p,
            isEnabled: nextState,
            status: nextState ? (p.status === 'disabled' ? 'healthy' : p.status) : 'disabled',
          };
        }
        return p;
      })
    );
  };

  const moveProviderPriority = (id: string, direction: 'up' | 'down') => {
    setProviders((prev) => {
      const list = [...prev].sort((a, b) => a.priority - b.priority);
      const index = list.findIndex((p) => p.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;

      // Swap
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;

      // Reassign priorities 1..N
      return list.map((item, idx) => ({
        ...item,
        priority: idx + 1,
      }));
    });
  };

  const testProvider = async (id: string): Promise<{ success: boolean; latencyMs: number; modelsCount: number; message: string }> => {
    const target = providers.find((p) => p.id === id);
    if (!target) throw new Error('Provider not found');

    // Simulate network validation
    await new Promise((r) => setTimeout(r, 650));

    const isRateLimited = target.status === 'rate-limited';
    const latency = Math.floor(Math.random() * 200) + 180;
    
    if (isRateLimited) {
      // Allow testing to verify or recover
      const recovered = Math.random() > 0.4;
      if (recovered) {
        updateProvider(id, { status: 'healthy', lastSuccess: 'Just now' });
        addToast({
          type: 'success',
          title: 'Provider health restored',
          description: `${target.name} responded in ${latency}ms. Rate limit window has cleared!`,
        });
        return { success: true, latencyMs: latency, modelsCount: target.modelsAvailable, message: 'Key valid & responsive' };
      } else {
        addToast({
          type: 'error',
          title: 'Provider rate-limited',
          description: `${target.name} still returns 429 Too Many Requests. Fallover chain will handle next traffic.`,
        });
        return { success: false, latencyMs: latency, modelsCount: target.modelsAvailable, message: 'Provider returned 429 rate_limit_error' };
      }
    }

    updateProvider(id, { lastSuccess: 'Just now' });
    addToast({
      type: 'success',
      title: 'Key verified',
      description: `${target.name} pinged in ${latency}ms. ${target.modelsAvailable} models available.`,
    });
    return { success: true, latencyMs: latency, modelsCount: target.modelsAvailable, message: 'Key valid & verified' };
  };

  const simulateFailover = (from: ProviderId, to: ProviderId, reason: string) => {
    const newFailover: FailoverEvent = {
      id: `fo-${Date.now()}`,
      timestamp: 'Just now',
      fromProvider: from,
      toProvider: to,
      errorCode: reason,
      errorDescription: `${from.toUpperCase()} reached threshold. Continuous context routed to ${to.toUpperCase()}.`,
      latencyMs: 1420,
      sessionId: selectedSessionId,
      resolved: true,
    };
    setFailovers((prev) => [newFailover, ...prev]);

    const newActivity: ActivityLogRow = {
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
      sessionId: selectedSessionId,
      providerChain: [
        { provider: from, status: 'failed', code: 429, latencyMs: 310, errorReason: reason },
        { provider: to, status: 'ok', code: 200, latencyMs: 620 },
      ],
      finalModel: to === 'gemini' ? 'gemini-2.5-flash' : to === 'claude' ? 'claude-3-7-sonnet' : 'gpt-4o',
      statusCode: 200,
      latencyMs: 930,
      tokensPrompt: 1840,
      tokensCompletion: 460,
      errorClassification: `Silent automatic failover: ${from} -> ${to}`,
    };
    setActivityLogs((prev) => [newActivity, ...prev]);

    addToast({
      type: 'warning',
      title: 'Failover triggered',
      description: `${from.toUpperCase()} failed (${reason}). Request completed by ${to.toUpperCase()} in 930ms.`,
    });
  };

  const createApiKey = (name: string): { fullKey: string; item: ApiKeyItem } => {
    const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullKey = `cnt_live_${hex}`;
    const prefix = `cnt_live_${hex.slice(0, 4)}••••••••••••`;
    const newItem: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: name || 'Default Gateway Key',
      prefix,
      createdAt: 'Today',
      lastUsedAt: 'Never',
      status: 'active',
      rateLimitReqSec: 100,
    };
    setApiKeys((prev) => [newItem, ...prev]);
    return { fullKey, item: newItem };
  };

  const revokeApiKey = (id: string) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k))
    );
    addToast({
      type: 'warning',
      title: 'API key revoked',
      description: 'Incoming requests with this key will now be rejected with 401 Unauthorized.',
    });
  };

  const updatePolicy = (partial: Partial<FailoverPolicy>) => {
    setFailoverPolicy((prev) => ({ ...prev, ...partial }));
    addToast({
      type: 'success',
      title: 'Policy updated',
      description: 'Failover routing parameters have been synchronized with the gateway.',
    });
  };

  const healthyCount = providers.filter((p) => p.isEnabled && p.status === 'healthy').length;

  const metrics = {
    requests24h: 42850,
    failovers24h: 142,
    avgLatencyMs: 412,
    activeSessions: 86,
    healthyCount,
    totalProviders: providers.filter((p) => p.isEnabled).length,
  };

  return (
    <DashboardContext.Provider
      value={{
        providers,
        addProvider,
        updateProvider,
        deleteProvider,
        toggleProvider,
        moveProviderPriority,
        testProvider,
        failovers,
        activityLogs,
        simulateFailover,
        apiKeys,
        createApiKey,
        revokeApiKey,
        failoverPolicy,
        updatePolicy,
        selectedSessionId,
        setSelectedSessionId,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isAddProviderModalOpen,
        setIsAddProviderModalOpen,
        toasts,
        addToast,
        removeToast,
        metrics,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
