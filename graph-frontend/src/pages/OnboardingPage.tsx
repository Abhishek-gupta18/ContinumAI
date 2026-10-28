import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listKeys, saveKey, testKey, createSession, listSessions, ProviderKeyConfig } from '../api';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [keys, setKeys] = useState<ProviderKeyConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('gemini');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    const data = await listKeys();
    setKeys(data);
    const existing = data.find((k) => k.status === 'connected');
    if (existing) {
      setSelectedProviderId(existing.id);
      setSelectedModel(existing.defaultModel);
    }
  };

  const handleSaveFirstKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setError('Please enter a valid API key string');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      await saveKey(selectedProviderId, apiKeyInput, selectedModel);
      await loadKeys();
      setIsSaving(false);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to save key');
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testKey(selectedProviderId);
      const isOk = res.status === 'connected';
      setTestResult({
        success: isOk,
        latencyMs: res.latencyMs,
        message: isOk ? 'Connected successfully' : `Status: ${res.status}`,
      });
      setIsTesting(false);
      if (isOk) {
        setTimeout(() => setStep(3), 600);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Key test failed' });
      setIsTesting(false);
    }
  };

  const handleLaunchFirstSession = async () => {
    try {
      const existing = await listSessions();
      if (existing.length > 0) {
        navigate(`/app?session=${existing[0].id}`);
      } else {
        const newSession = await createSession('First continuity session');
        navigate(`/app?session=${newSession.id}`);
      }
    } catch {
      navigate('/app');
    }
  };

  const providerMeta: Record<string, { label: string; model: string; color: string; glow: string }> = {
    openai: { label: 'OpenAI', model: 'gpt-4o', color: '#F0A35E', glow: 'glow-gpt' },
    gemini: { label: 'Gemini', model: 'gemini-1.5-pro', color: '#BFD4FF', glow: 'glow-gemini' },
    claude: { label: 'Claude', model: 'claude-3-5-sonnet', color: '#E58AB0', glow: 'glow-claude' },
    openrouter: { label: 'OpenRouter', model: 'meta-llama/llama-3.3-70b', color: '#9BE3C4', glow: 'glow-openrouter' },
  };

  return (
    <div className="min-h-screen bg-[#14122B] text-[#EEEAF7] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#2A2455] px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
          <span className="font-display font-bold text-base text-[#EEEAF7]">ContinumAI</span>
        </Link>
        <Link to="/app" className="text-xs text-[#9C98B8] hover:text-[#EEEAF7] transition-colors">
          Skip to workspace
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col justify-center text-left">
        {/* Stepper Progress Line */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-3.5 left-0 right-0 h-[1.5px] bg-[#2A2455]" />
            <div
              className="absolute top-3.5 left-0 h-[1.5px] bg-[#BFD4FF] transition-all duration-300"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />

            {/* Step 1 Indicator */}
            <div className="relative flex flex-col items-center">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono-code transition-all ${
                  step >= 1
                    ? 'bg-[#BFD4FF] text-[#14122B] glow-gemini font-bold'
                    : 'bg-[#14122B] border border-[#2A2455] text-[#9C98B8]'
                }`}
              >
                1
              </span>
              <span className="mt-2 text-xs text-[#EEEAF7]">Connect key</span>
            </div>

            {/* Step 2 Indicator */}
            <div className="relative flex flex-col items-center">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono-code transition-all ${
                  step >= 2
                    ? 'bg-[#BFD4FF] text-[#14122B] glow-gemini font-bold'
                    : 'bg-[#14122B] border border-[#2A2455] text-[#9C98B8]'
                }`}
              >
                2
              </span>
              <span className="mt-2 text-xs text-[#EEEAF7]">Test connection</span>
            </div>

            {/* Step 3 Indicator */}
            <div className="relative flex flex-col items-center">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono-code transition-all ${
                  step === 3
                    ? 'bg-[#BFD4FF] text-[#14122B] glow-gemini font-bold'
                    : 'bg-[#14122B] border border-[#2A2455] text-[#9C98B8]'
                }`}
              >
                3
              </span>
              <span className="mt-2 text-xs text-[#EEEAF7]">Start session</span>
            </div>
          </div>
        </div>

        {/* Step Card: Flat Nightfall, small radius, no shadows */}
        <div className="bg-[#14122B] border border-[#2A2455] rounded-lg p-8">
          {/* STEP 1: Add First Key */}
          {step === 1 && (
            <div>
              <h1 className="font-display font-bold text-2xl text-[#EEEAF7] tracking-tight">
                Connect your first provider key
              </h1>
              <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[55ch]">
                ContinumAI requires at least one active model key to initiate memory routing. All keys are write-only and never exposed in cleartext.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-md bg-[#2A2455] border border-rose-500/60 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Provider Selection */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(providerMeta).map(([id, meta]) => {
                  const isSelected = selectedProviderId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedProviderId(id);
                        setSelectedModel(meta.model);
                      }}
                      className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#BFD4FF] bg-[#2A2455]'
                          : 'border-[#2A2455] bg-[#14122B] hover:border-[#38326e]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? meta.glow : ''}`}
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="text-xs font-medium text-[#EEEAF7]">{meta.label}</span>
                      </div>
                      <div className="text-[11px] font-mono-code text-[#9C98B8] truncate">{meta.model}</div>
                    </button>
                  );
                })}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSaveFirstKey} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                    {providerMeta[selectedProviderId]?.label || selectedProviderId} API key
                  </label>
                  <input
                    type="password"
                    required
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      selectedProviderId === 'openai'
                        ? 'sk-…'
                        : selectedProviderId === 'gemini'
                        ? 'AIza…'
                        : selectedProviderId === 'claude'
                        ? 'sk-ant-…'
                        : 'sk-or-…'
                    }
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-sm text-[#EEEAF7] font-mono-code focus:outline-none focus:border-[#BFD4FF] transition-colors"
                  />
                  <p className="mt-1.5 text-xs text-[#9C98B8]">
                    Key will be masked as <span className="font-mono-code text-[#EEEAF7]">sk-…a1b2</span> upon storage.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setApiKeyInput('sk-live-mock-demo-key-continuity')}
                    className="text-xs text-[#BFD4FF] hover:underline"
                  >
                    Use simulated test key
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Storing in vault...' : 'Save and continue'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Test Connection */}
          {step === 2 && (
            <div>
              <h1 className="font-display font-bold text-2xl text-[#EEEAF7] tracking-tight">
                Verify provider connectivity
              </h1>
              <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[55ch]">
                We will dispatch an empty health turn to verify that your credentials resolve successfully and return latency metrics.
              </p>

              <div className="mt-6 p-4 rounded-md bg-[#14122B] border border-[#2A2455]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: providerMeta[selectedProviderId]?.color || '#BFD4FF' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-[#EEEAF7]">
                        {providerMeta[selectedProviderId]?.label || selectedProviderId}
                      </div>
                      <div className="text-xs font-mono-code text-[#9C98B8]">
                        {selectedModel}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono-code text-[#BFD4FF]">masked in vault</span>
                </div>
              </div>

              {testResult && (
                <div
                  className={`mt-4 p-3.5 rounded-md text-xs font-mono-code ${
                    testResult.success
                      ? 'bg-[#2A2455] border border-[#BFD4FF]/50 text-[#EEEAF7]'
                      : 'bg-[#2A2455] border border-rose-500/60 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{testResult.message}</span>
                    {testResult.latencyMs && <span>{testResult.latencyMs}ms roundtrip</span>}
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#9C98B8] hover:text-[#EEEAF7]"
                >
                  Back to key input
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-5 py-2 rounded-full text-xs font-medium border border-[#2A2455] hover:bg-[#2A2455] text-[#EEEAF7] transition-colors"
                  >
                    {isTesting ? 'Pinging endpoint...' : 'Test connection'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-2 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
                  >
                    Proceed to session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Start First Session */}
          {step === 3 && (
            <div>
              <h1 className="font-display font-bold text-2xl text-[#EEEAF7] tracking-tight">
                Your continuity gateway is ready
              </h1>
              <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[55ch]">
                Provider credentials verified. As you send queries, memory will persist across turns, even if a model rate limits or fails over.
              </p>

              <div className="mt-6 p-4 rounded-md bg-[#14122B] border border-[#2A2455] text-xs text-[#9C98B8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span>Primary model</span>
                  <span className="font-mono-code text-[#EEEAF7]">{selectedModel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Memory graph store</span>
                  <span className="font-mono-code text-[#BFD4FF]">Active directed chain</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Failover cascade</span>
                  <span className="font-mono-code text-[#EEEAF7]">Configured in settings</span>
                </div>
              </div>

              <div className="mt-8 pt-2 flex items-center justify-between">
                <Link
                  to="/app/settings/keys"
                  className="text-xs text-[#9C98B8] hover:text-[#EEEAF7]"
                >
                  Add secondary provider
                </Link>

                <button
                  type="button"
                  onClick={handleLaunchFirstSession}
                  className="px-7 py-2.5 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
                >
                  Open live workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-[#2A2455] px-6 lg:px-8 flex items-center justify-between text-xs text-[#9C98B8]">
        <div>ContinumAI onboarding</div>
        <div>Write-only vault active</div>
      </footer>
    </div>
  );
};
