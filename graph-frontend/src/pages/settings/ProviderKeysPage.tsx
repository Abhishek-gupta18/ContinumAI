import React, { useState, useEffect } from 'react';
import {
  listKeys,
  saveKey,
  deleteKey,
  testKey,
  updateKeyOrder,
  toggleKeyEnabled,
  updateProviderModel,
  ProviderKeyConfig,
} from '../../api';
import {
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';

export const ProviderKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<ProviderKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModalProvider, setActiveModalProvider] = useState<ProviderKeyConfig | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    const data = await listKeys();
    setKeys(data);
    setLoading(false);
  };

  const handleOpenModal = (provider: ProviderKeyConfig) => {
    setActiveModalProvider(provider);
    setInputKey('');
    setSelectedModel(provider.defaultModel);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProvider || !inputKey.trim()) return;
    setSavingKey(true);
    try {
      await saveKey(activeModalProvider.id, inputKey, selectedModel);
      await loadKeys();
      setActiveModalProvider(null);
      setInputKey('');
      setFeedback(`Key for ${activeModalProvider.name} saved in vault.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to save key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDelete = async (providerId: string) => {
    await deleteKey(providerId);
    await loadKeys();
    setFeedback(`Key deleted for provider.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleTest = async (providerId: string) => {
    setTestingId(providerId);
    try {
      const res = await testKey(providerId);
      const isOk = res.status === 'connected';
      setFeedback(
        isOk
          ? `Verified ${providerId}: latency ${res.latencyMs}ms`
          : `Verification status: ${res.status}`
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || 'Verification failed');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setTestingId(null);
    }
  };

  const handleToggle = async (providerId: string, currentEnabled: boolean) => {
    await toggleKeyEnabled(providerId, !currentEnabled);
    await loadKeys();
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= keys.length) return;

    const newOrder = [...keys];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setKeys(newOrder);
    await updateKeyOrder(newOrder.map((k) => k.id));
  };

  const handleModelChange = async (providerId: string, model: string) => {
    await updateProviderModel(providerId, model);
    await loadKeys();
  };

  const getProviderDot = (providerId: string) => {
    if (providerId === 'openai') return { color: '#F0A35E', glow: 'glow-gpt' };
    if (providerId === 'gemini') return { color: '#BFD4FF', glow: 'glow-gemini' };
    if (providerId === 'claude') return { color: '#E58AB0', glow: 'glow-claude' };
    if (providerId === 'openrouter') return { color: '#9BE3C4', glow: 'glow-openrouter' };
    return { color: '#EEEAF7', glow: '' };
  };

  const getStatusBadge = (status: ProviderKeyConfig['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#BFD4FF]/40 text-[#BFD4FF] bg-[#2A2455]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFD4FF] glow-gemini" />
            <span>Connected</span>
          </span>
        );
      case 'rate_limited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#F0A35E]/40 text-[#F0A35E] bg-[#2A2455]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0A35E] glow-gpt" />
            <span>Rate-limited</span>
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-rose-500/40 text-rose-300 bg-[#2A2455]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Invalid</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#2A2455] text-[#9C98B8] bg-[#14122B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9C98B8]" />
            <span>Not set</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-[#14122B] text-[#EEEAF7] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Page Title & Context */}
        <div className="border-b border-[#2A2455] pb-6">
          <h1 className="font-display font-bold text-3xl text-[#EEEAF7] tracking-tight">
            Provider credentials & failover priority
          </h1>
          <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[65ch]">
            Add credentials for each frontier model. The gateway routes calls to the highest enabled provider in your cascade, failing over automatically if rate limits or errors occur.
          </p>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className="p-3.5 rounded-lg bg-[#2A2455] border border-[#BFD4FF]/50 text-xs font-mono-code text-[#EEEAF7] flex items-center justify-between">
            <span>{feedback}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#9C98B8] hover:text-[#EEEAF7]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Provider Cards */}
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9C98B8]">Loading provider credentials...</div>
        ) : (
          <div className="space-y-4">
            {keys.map((provider, index) => {
              const isFirst = index === 0;
              const isLast = index === keys.length - 1;
              const isTesting = testingId === provider.id;
              const dot = getProviderDot(provider.id);

              return (
                <div
                  key={provider.id}
                  id={`provider-card-${provider.id}`}
                  className={`p-5 rounded-lg bg-[#14122B] border transition-colors ${
                    provider.enabled
                      ? 'border-[#2A2455]'
                      : 'border-[#2A2455]/50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Priority & Provider details */}
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Priority position */}
                      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-[#2A2455] text-[#BFD4FF] text-xs font-mono-code font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1 text-[#9C98B8] hover:text-[#EEEAF7] disabled:opacity-20 transition-colors"
                            title="Move up priority"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1 text-[#9C98B8] hover:text-[#EEEAF7] disabled:opacity-20 transition-colors"
                            title="Move down priority"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Info & masked key */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${provider.enabled ? dot.glow : ''}`}
                            style={{ backgroundColor: dot.color }}
                          />
                          <h3 className="font-display font-bold text-base text-[#EEEAF7] truncate">
                            {provider.name}
                          </h3>
                          {getStatusBadge(provider.status)}
                        </div>
                        <p className="text-xs text-[#9C98B8] font-body line-clamp-1 mb-2.5">
                          {provider.description}
                        </p>

                        {/* Masked Key Display (Write-Only) */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#14122B] border border-[#2A2455] font-mono-code text-xs">
                            <span className="text-[#9C98B8]">Key:</span>
                            {provider.maskedKey ? (
                              <span className="text-[#EEEAF7]">{provider.maskedKey}</span>
                            ) : (
                              <span className="text-[#9C98B8]">Not set</span>
                            )}
                          </div>

                          {/* Default Model Selector */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#9C98B8]">Default model:</span>
                            <select
                              value={provider.defaultModel}
                              onChange={(e) => handleModelChange(provider.id, e.target.value)}
                              className="bg-[#14122B] border border-[#2A2455] rounded-md px-2.5 py-1 text-xs text-[#EEEAF7] focus:outline-none focus:border-[#BFD4FF] font-mono-code"
                            >
                              {provider.availableModels.map((m) => (
                                <option key={m} value={m} className="bg-[#14122B]">
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>

                          {provider.lastTested && (
                            <span className="text-[11px] font-mono-code text-[#9C98B8]">
                              Checked {provider.lastTested} ({provider.lastLatencyMs || 24}ms)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-center">
                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggle(provider.id, provider.enabled)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          provider.enabled
                            ? 'border-[#2A2455] bg-[#2A2455] text-[#EEEAF7]'
                            : 'border-[#2A2455] text-[#9C98B8] hover:text-[#EEEAF7]'
                        }`}
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      {/* Test Connection Button */}
                      <button
                        type="button"
                        disabled={!provider.maskedKey || isTesting}
                        onClick={() => handleTest(provider.id)}
                        className="px-4 py-1.5 rounded-full text-xs font-medium border border-[#2A2455] hover:bg-[#2A2455] text-[#EEEAF7] disabled:opacity-30 transition-colors"
                      >
                        {isTesting ? 'Testing...' : 'Test'}
                      </button>

                      {/* Replace / Set Key Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenModal(provider)}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
                      >
                        {provider.maskedKey ? 'Replace' : 'Add key'}
                      </button>

                      {/* Delete Key Button */}
                      {provider.maskedKey && (
                        <button
                          type="button"
                          onClick={() => handleDelete(provider.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium text-rose-300 hover:bg-[#2A2455] transition-colors"
                          title="Remove key from vault"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Write-Only Key Entry */}
        {activeModalProvider && (
          <div className="fixed inset-0 z-50 bg-[#14122B]/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#14122B] border border-[#2A2455] rounded-lg max-w-md w-full p-6 text-left">
              <div className="flex items-center justify-between pb-4 border-b border-[#2A2455]">
                <h3 className="font-display font-bold text-lg text-[#EEEAF7]">
                  {activeModalProvider.maskedKey ? 'Replace' : 'Add'} {activeModalProvider.name} key
                </h3>
                <button
                  onClick={() => setActiveModalProvider(null)}
                  className="p-1 rounded-full text-[#9C98B8] hover:text-[#EEEAF7]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveKey} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                    API key string (write-only)
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter secret API key..."
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-sm text-[#EEEAF7] font-mono-code focus:outline-none focus:border-[#BFD4FF] transition-colors"
                  />
                  <p className="mt-1.5 text-xs text-[#9C98B8]">
                    Write-only: after save, the key is permanently masked as <span className="font-mono-code text-[#EEEAF7]">sk-…a1b2</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                    Preferred default model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-sm text-[#EEEAF7] font-mono-code focus:outline-none focus:border-[#BFD4FF]"
                  >
                    {activeModalProvider.availableModels.map((m) => (
                      <option key={m} value={m} className="bg-[#14122B]">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModalProvider(null)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-[#9C98B8] hover:text-[#EEEAF7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingKey || !inputKey.trim()}
                    className="px-6 py-2 rounded-full text-xs font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    {savingKey ? 'Storing...' : 'Save key'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
