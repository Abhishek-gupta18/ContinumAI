import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  Plus,
  GripVertical,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MoreVertical,
  Trash2,
  RefreshCw,
  Edit2,
  Eye,
  EyeOff,
  Clipboard,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  Check,
  Server,
  Zap,
} from 'lucide-react';
import { PROVIDER_THEMES } from '../../data/dashboardData';
import { ProviderId, ProviderConfig, ProviderStatus } from '../../types/dashboard';

export const ProvidersPage: React.FC = () => {
  const {
    providers,
    addProvider,
    updateProvider,
    deleteProvider,
    toggleProvider,
    moveProviderPriority,
    testProvider,
    isAddProviderModalOpen,
    setIsAddProviderModalOpen,
    addToast,
  } = useDashboard();

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);

  // Overflow menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Delete modal state
  const [deleteCandidate, setDeleteCandidate] = useState<ProviderConfig | null>(null);

  // Add / Edit Modal form state
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [formProvider, setFormProvider] = useState<ProviderId>('openai');
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [formModelOverride, setFormModelOverride] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formPriority, setFormPriority] = useState<number>(providers.length + 1);

  // Validation inline state: 'idle' | 'validating' | 'valid' | 'invalid'
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  const openAddModal = () => {
    setEditingProvider(null);
    setFormProvider('openai');
    setFormName('OpenAI API');
    setFormKey('');
    setShowKey(false);
    setFormModelOverride('gpt-4o');
    setFormBaseUrl('');
    setFormPriority(providers.length + 1);
    setValidationState('idle');
    setValidationMessage('');
    setIsAddProviderModalOpen(true);
  };

  const openEditModal = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    setFormProvider(provider.provider);
    setFormName(provider.name);
    setFormKey(provider.maskedKey);
    setShowKey(false);
    setFormModelOverride(provider.modelOverride || provider.model);
    setFormBaseUrl(provider.customBaseUrl || '');
    setFormPriority(provider.priority);
    setValidationState('valid');
    setValidationMessage('Key previously verified');
    setIsAddProviderModalOpen(true);
    setOpenMenuId(null);
  };

  const handleValidateKey = async () => {
    if (!formKey.trim()) {
      setValidationState('invalid');
      setValidationMessage('Please enter an API key to validate.');
      return;
    }

    setValidationState('validating');
    setValidationMessage('Contacting provider API endpoint...');

    // Simulate key validation against provider
    setTimeout(() => {
      // If it looks like a fake bad key or too short
      if (formKey.length < 8) {
        setValidationState('invalid');
        setValidationMessage('Provider rejected this key: 401 unauthorized or invalid format.');
      } else {
        const modelCount = formProvider === 'openai' ? 18 : formProvider === 'gemini' ? 14 : formProvider === 'claude' ? 9 : 24;
        setValidationState('valid');
        setValidationMessage(`Key works, ${modelCount} models available on this account.`);
      }
    }, 900);
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormKey(text);
        setValidationState('idle');
        addToast({
          type: 'info',
          title: 'Key pasted',
          description: 'Ready to validate.',
        });
      }
    } catch {
      addToast({
        type: 'warning',
        title: 'Clipboard access',
        description: 'Please paste manually into the input box.',
      });
    }
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim()) {
      addToast({
        type: 'error',
        title: 'API key required',
        description: 'Provide an API key to add this provider.',
      });
      return;
    }

    const lastFour = formKey.slice(-4) || '99F1';
    const maskedKey = `sk-••••••••••${lastFour}`;

    if (editingProvider) {
      updateProvider(editingProvider.id, {
        name: formName || PROVIDER_THEMES[formProvider].name,
        provider: formProvider,
        model: formModelOverride || (formProvider === 'openai' ? 'gpt-4o' : formProvider === 'gemini' ? 'gemini-2.5-flash' : 'claude-3-7-sonnet'),
        maskedKey: formKey.includes('••••') ? editingProvider.maskedKey : maskedKey,
        priority: formPriority,
        customBaseUrl: formBaseUrl || undefined,
        modelOverride: formModelOverride || undefined,
      });
    } else {
      addProvider({
        name: formName || PROVIDER_THEMES[formProvider].name,
        provider: formProvider,
        model: formModelOverride || (formProvider === 'openai' ? 'gpt-4o' : formProvider === 'gemini' ? 'gemini-2.5-flash' : 'claude-3-7-sonnet'),
        maskedKey,
        priority: formPriority,
        status: 'healthy',
        isEnabled: true,
        modelsAvailable: formProvider === 'openai' ? 18 : formProvider === 'gemini' ? 14 : 9,
        customBaseUrl: formBaseUrl || undefined,
        modelOverride: formModelOverride || undefined,
      });
    }

    setIsAddProviderModalOpen(false);
  };

  const handleTestRow = async (provider: ProviderConfig) => {
    setTestingId(provider.id);
    try {
      await testProvider(provider.id);
    } finally {
      setTestingId(null);
    }
  };

  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Provider Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
            AI Providers & Priority Order
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] mt-1">
            Configure your own provider API keys. The gateway executes failover strictly in priority order 1..n.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-sm shadow-[#7C5CFF]/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add provider</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-3.5 rounded-xl bg-[#12151C] border border-[#232733] flex items-start gap-3">
        <Shield className="w-4 h-4 text-[#7C5CFF] shrink-0 mt-0.5" />
        <div className="text-xs text-[#8A92A6] leading-relaxed">
          <span className="font-semibold text-[#F1F3F9]">Zero storage of raw keys: </span>
          Your keys are encrypted at rest using AES-256-GCM and used only for your own requests.
          They are never shown again after saving. When you save a key, only its last four characters are visible.
        </div>
      </div>

      {/* Providers Ordered List or Empty State */}
      {sortedProviders.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#12151C] border border-[#232733]">
          <div className="w-12 h-12 rounded-xl bg-[#181C26] border border-[#232733] flex items-center justify-center mx-auto mb-3 text-[#8A92A6]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#F1F3F9] mb-1">
            Add your first provider to start using the gateway
          </h3>
          <p className="text-xs text-[#8A92A6] max-w-sm mx-auto mb-4">
            Connect OpenAI, Gemini, Claude, or NVIDIA with your own keys to enable automatic memory-preserving failover.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add provider</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedProviders.map((p, index) => {
            const theme = PROVIDER_THEMES[p.provider];
            const isFirst = index === 0;
            const isLast = index === sortedProviders.length - 1;
            const isTesting = testingId === p.id;

            let statusBadge = (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                Healthy
              </span>
            );

            if (p.status === 'rate-limited') {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  Rate-limited
                </span>
              );
            } else if (p.status === 'auth-error') {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Auth error
                </span>
              );
            } else if (p.status === 'timeout') {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  Timeout
                </span>
              );
            } else if (p.status === 'disabled' || !p.isEnabled) {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#181C26] text-[#8A92A6] border border-[#232733]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A92A6]" />
                  Disabled
                </span>
              );
            }

            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl bg-[#12151C] border border-[#232733] hover:border-[#323849] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !p.isEnabled ? 'opacity-60' : ''
                }`}
              >
                {/* Left: Drag Handle, Priority, Provider Details, Masked Key */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Priority & Reorder Controls */}
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveProviderPriority(p.id, 'up')}
                        disabled={isFirst}
                        className={`p-1 rounded hover:bg-[#181C26] transition-colors ${
                          isFirst ? 'opacity-20 cursor-not-allowed' : 'text-[#8A92A6] hover:text-[#F1F3F9]'
                        }`}
                        title="Move priority up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveProviderPriority(p.id, 'down')}
                        disabled={isLast}
                        className={`p-1 rounded hover:bg-[#181C26] transition-colors ${
                          isLast ? 'opacity-20 cursor-not-allowed' : 'text-[#8A92A6] hover:text-[#F1F3F9]'
                        }`}
                        title="Move priority down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#0B0D12] border border-[#232733] flex items-center justify-center font-mono-code text-xs font-semibold text-[#8A92A6]">
                      #{p.priority}
                    </div>
                  </div>

                  {/* Provider Logo Color Indicator + Names */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: theme.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#F1F3F9] truncate">
                          {p.name}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono-code"
                          style={{
                            color: theme.color,
                            backgroundColor: theme.bgSubtle,
                            border: `1px solid ${theme.border}`,
                          }}
                        >
                          {p.model}
                        </span>
                      </div>

                      {/* Masked key in monospace (last 4 only) */}
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8A92A6]">
                        <span className="font-mono-code text-[#BFD4FF] bg-[#0B0D12] px-1.5 py-0.5 rounded border border-[#232733]">
                          {p.maskedKey}
                        </span>
                        {p.customBaseUrl && (
                          <span className="text-[11px] font-mono-code text-[#8A92A6] truncate max-w-xs">
                            {p.customBaseUrl}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[11px]">Avg {p.avgLatencyMs}ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Status badge, Enable/Disable toggle, Test button, Overflow menu */}
                <div className="flex items-center gap-3 ml-auto md:ml-0">
                  {statusBadge}

                  {/* Enable / Disable Switch Toggle */}
                  <button
                    onClick={() => toggleProvider(p.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      p.isEnabled ? 'bg-[#7C5CFF]' : 'bg-[#232733]'
                    }`}
                    title={p.isEnabled ? 'Disable provider' : 'Enable provider'}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        p.isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Test button */}
                  <button
                    onClick={() => handleTestRow(p)}
                    disabled={isTesting}
                    className="px-3 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] hover:border-[#323849] text-xs font-medium text-[#F1F3F9] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#7C5CFF]" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-[#10B981]" />
                        <span>Test</span>
                      </>
                    )}
                  </button>

                  {/* Overflow menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                      className="p-1.5 rounded-lg text-[#8A92A6] hover:text-[#F1F3F9] hover:bg-[#181C26] transition-colors"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === p.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-[#12151C] border border-[#232733] rounded-lg shadow-xl z-20 py-1 divide-y divide-[#232733]">
                        <button
                          onClick={() => openEditModal(p)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#F1F3F9] hover:bg-[#181C26] flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3 text-[#8A92A6]" />
                          Edit config
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleTestRow(p);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#F1F3F9] hover:bg-[#181C26] flex items-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3 text-[#8A92A6]" />
                          Rotate key
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeleteCandidate(p);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3 text-[#EF4444]" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Provider Modal */}
      {isAddProviderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg bg-[#12151C] border border-[#232733] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#232733] bg-[#0B0D12]/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#7C5CFF]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F1F3F9]">
                    {editingProvider ? 'Edit Provider Configuration' : 'Add AI Provider'}
                  </h3>
                  <p className="text-xs text-[#8A92A6]">
                    Your API key is used strictly for your own gateway traffic
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProviderModalOpen(false)}
                className="text-[#8A92A6] hover:text-[#F1F3F9] p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProvider} className="p-5 space-y-4">
              {/* Provider Selector */}
              <div>
                <label className="text-xs font-medium text-[#F1F3F9] block mb-1.5">
                  AI Provider
                </label>
                <select
                  value={formProvider}
                  onChange={(e) => {
                    const p = e.target.value as ProviderId;
                    setFormProvider(p);
                    setFormName(PROVIDER_THEMES[p].name);
                    if (p === 'openai') setFormModelOverride('gpt-4o');
                    else if (p === 'gemini') setFormModelOverride('gemini-2.5-flash');
                    else if (p === 'claude') setFormModelOverride('claude-3-7-sonnet');
                    else if (p === 'nvidia') setFormModelOverride('meta/llama-3.3-70b-instruct');
                    else setFormModelOverride('custom-model');
                    setValidationState('idle');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                >
                  <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
                  <option value="gemini">Google Gemini (Gemini 2.5 Flash / Pro)</option>
                  <option value="claude">Anthropic Claude (Claude 3.7 Sonnet / Haiku)</option>
                  <option value="nvidia">NVIDIA NIM (Llama 3.3, Mistral, Nemotron)</option>
                  <option value="custom">OpenAI-Compatible Custom Endpoint</option>
                </select>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs font-medium text-[#F1F3F9] block mb-1.5">
                  Friendly Label
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Primary OpenAI Key"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
                />
              </div>

              {/* API Key Field with Show/Hide & Paste button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#F1F3F9]">
                    API Key
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteKey}
                    className="text-[11px] text-[#7C5CFF] hover:text-[#9B82FF] flex items-center gap-1"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formKey}
                    onChange={(e) => {
                      setFormKey(e.target.value);
                      setValidationState('idle');
                    }}
                    placeholder={
                      formProvider === 'openai'
                        ? 'sk-proj-...'
                        : formProvider === 'gemini'
                        ? 'AIzaSy...'
                        : formProvider === 'claude'
                        ? 'sk-ant-api03-...'
                        : 'nvapi-...'
                    }
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs font-mono-code text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A92A6] hover:text-[#F1F3F9]"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Custom Base URL (only shown for OpenAI-compatible) */}
              {formProvider === 'custom' && (
                <div>
                  <label className="text-xs font-medium text-[#F1F3F9] block mb-1">
                    Custom Base URL
                  </label>
                  <input
                    type="url"
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder="https://api.together.xyz/v1 or https://openrouter.ai/api/v1"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs font-mono-code text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
                  />
                  <p className="text-[11px] text-[#8A92A6] mt-1">
                    HTTPS only. Private network addresses (localhost, 127.0.0.1, RFC 1918) are blocked for security.
                  </p>
                </div>
              )}

              {/* Optional Model Override */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#F1F3F9] block mb-1.5">
                    Model Identifier
                  </label>
                  <input
                    type="text"
                    value={formModelOverride}
                    onChange={(e) => setFormModelOverride(e.target.value)}
                    placeholder="gpt-4o"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs font-mono-code text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#F1F3F9] block mb-1.5">
                    Priority Rank
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                  >
                    {Array.from({ length: providers.length + 1 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Priority #{num} {num === 1 ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validate Key Button & Inline Validation States */}
              <div className="pt-2 border-t border-[#232733]/60">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={handleValidateKey}
                    disabled={validationState === 'validating'}
                    className="px-3 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs text-[#F1F3F9] font-medium flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {validationState === 'validating' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C5CFF]" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Validate key</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-[#8A92A6]">
                    Performs a 0-token auth probe
                  </span>
                </div>

                {/* Validation message feedback */}
                {validationState === 'valid' && (
                  <div className="p-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 flex items-center gap-2 text-xs text-[#10B981]">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationMessage || 'Key works, 14 models available'}</span>
                  </div>
                )}
                {validationState === 'invalid' && (
                  <div className="p-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center gap-2 text-xs text-[#EF4444]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationMessage || 'Provider rejected this key'}</span>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Footer */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProviderModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#181C26] hover:bg-[#1E2330] text-xs font-medium text-[#8A92A6] hover:text-[#F1F3F9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white transition-all shadow-sm shadow-[#7C5CFF]/30"
                >
                  {editingProvider ? 'Update provider' : 'Save provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-[#12151C] border border-[#232733] rounded-xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F3F9] mb-1">
              Delete {deleteCandidate.name}?
            </h3>
            <p className="text-xs text-[#8A92A6] leading-relaxed mb-4">
              This provider will be removed from your gateway priority chain. Any in-flight requests
              will skip to the remaining healthy providers.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] text-xs font-medium text-[#8A92A6] hover:text-[#F1F3F9] transition-colors"
              >
                Keep provider
              </button>
              <button
                onClick={() => {
                  deleteProvider(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-xs font-semibold text-white transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
