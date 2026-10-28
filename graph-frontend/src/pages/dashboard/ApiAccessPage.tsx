import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  Copy,
  Check,
  Plus,
  Terminal,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  Code,
  Gauge,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ApiKeyItem } from '../../types/dashboard';

export const ApiAccessPage: React.FC = () => {
  const { apiKeys, createApiKey, revokeApiKey, addToast } = useDashboard();
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  // Create Key Modal state
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedRevealedKey, setCopiedRevealedKey] = useState(false);

  // Revoke modal state
  const [revokeCandidate, setRevokeCandidate] = useState<ApiKeyItem | null>(null);

  const endpointUrl = 'https://gateway.continum.ai/v1/chat/completions';

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    addToast({
      type: 'success',
      title: 'Endpoint copied',
      description: 'Continuum gateway URL copied to clipboard.',
    });
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast({
        type: 'error',
        title: 'Key name required',
        description: 'Please name this key (e.g. Production Cluster).',
      });
      return;
    }

    const { fullKey } = createApiKey(newKeyName.trim());
    setRevealedKey(fullKey);
    setCopiedRevealedKey(false);
  };

  const handleCopyRevealedKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopiedRevealedKey(true);
    addToast({
      type: 'success',
      title: 'Key copied',
      description: 'Store this key in your secrets manager.',
    });
    setTimeout(() => setCopiedRevealedKey(false), 2000);
  };

  const handleCloseCreateModal = () => {
    setIsCreateKeyModalOpen(false);
    setRevealedKey(null);
    setNewKeyName('');
  };

  // Code sample templates
  const codeSamples = {
    curl: `curl https://gateway.continum.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cnt_live_4f92••••••••••••" \\
  -d '{
    "model": "continum/auto-failover",
    "messages": [
      {"role": "system", "content": "You are an autonomous engineering agent."},
      {"role": "user", "content": "Check Redis replica lag under peak traffic"}
    ],
    "temperature": 0.2
  }'`,
    js: `import OpenAI from "openai";

// Drop-in replacement for OpenAI SDK:
const continuum = new OpenAI({
  baseURL: "https://gateway.continum.ai/v1",
  apiKey: process.env.CONTINUUM_API_KEY, // "cnt_live_..."
});

async function main() {
  const response = await continuum.chat.completions.create({
    model: "continum/auto-failover",
    messages: [
      { role: "user", content: "Check Redis replica lag under peak traffic" },
    ],
  });

  // Automatically served by OpenAI, Gemini, or Claude without losing memory!
  console.log(response.choices[0].message.content);
}

main();`,
    python: `from openai import OpenAI
import os

# Point official OpenAI client to Continuum Gateway:
client = OpenAI(
    base_url="https://gateway.continum.ai/v1",
    api_key=os.environ.get("CONTINUUM_API_KEY"),  # "cnt_live_..."
)

response = client.chat.completions.create(
    model="continum/auto-failover",
    messages=[
        {"role": "user", "content": "Check Redis replica lag under peak traffic"}
    ]
)

# Output continued seamlessly even if primary provider hits 429
print(response.choices[0].message.content)`,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSamples[activeCodeTab]);
    setCopiedCode(true);
    addToast({
      type: 'success',
      title: 'Code sample copied',
      description: `Copied ${activeCodeTab.toUpperCase()} snippet.`,
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
            Gateway API Access & Tokens
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] mt-1">
            Authenticate your backend applications with ONE Continuum key and endpoint.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateKeyModalOpen(true);
            setRevealedKey(null);
            setNewKeyName('');
          }}
          className="px-4 py-2 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-sm shadow-[#7C5CFF]/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create key</span>
        </button>
      </div>

      {/* Continuum Endpoint Card */}
      <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#F1F3F9] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#7C5CFF]" />
              Continuum Gateway Endpoint
            </h2>
            <p className="text-xs text-[#8A92A6] mt-0.5">
              Standard OpenAI-compatible completions endpoint. Replace baseUrl in your SDK.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0B0D12] border border-[#232733] px-3.5 py-2 rounded-lg">
            <code className="text-xs font-mono-code text-[#BFD4FF] select-all">
              {endpointUrl}
            </code>
            <button
              onClick={handleCopyEndpoint}
              className="p-1 rounded text-[#8A92A6] hover:text-[#F1F3F9] transition-colors"
              title="Copy endpoint URL"
            >
              {copiedEndpoint ? (
                <Check className="w-4 h-4 text-[#10B981]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F1F3F9]">Continuum API Keys</h3>
            <p className="text-xs text-[#8A92A6] mt-0.5">
              Keys grant access to your gateway priority router and shared memory chain.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232733] text-[#8A92A6] uppercase text-[10px] tracking-wider font-mono-code">
                <th className="pb-3 font-semibold">Key Name</th>
                <th className="pb-3 font-semibold">Prefix</th>
                <th className="pb-3 font-semibold">Created</th>
                <th className="pb-3 font-semibold">Last Used</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232733]/60">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-[#181C26]/40 transition-colors">
                  <td className="py-3.5 font-medium text-[#F1F3F9]">{k.name}</td>
                  <td className="py-3.5 font-mono-code text-[#BFD4FF]">{k.prefix}</td>
                  <td className="py-3.5 text-[#8A92A6]">{k.createdAt}</td>
                  <td className="py-3.5 text-[#8A92A6]">{k.lastUsedAt}</td>
                  <td className="py-3.5">
                    {k.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    {k.status === 'active' ? (
                      <button
                        onClick={() => setRevokeCandidate(k)}
                        className="px-2.5 py-1 rounded bg-[#181C26] hover:bg-[#EF4444]/20 border border-[#232733] hover:border-[#EF4444]/40 text-[11px] text-[#8A92A6] hover:text-[#EF4444] transition-colors"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#8A92A6] italic">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Limit Usage Meter & Code Samples (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Rate Limit Meter (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#12151C] border border-[#232733] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#F1F3F9] flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#7C5CFF]" />
                Rate Limit Meter
              </h3>
              <span className="text-[10px] font-mono-code bg-[#7C5CFF]/15 text-[#BFD4FF] border border-[#7C5CFF]/30 px-1.5 py-0.5 rounded">
                Tier: Dev
              </span>
            </div>
            <p className="text-xs text-[#8A92A6] mb-4">
              Monthly burst and gateway bandwidth utilization.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#8A92A6]">Monthly Requests</span>
                  <span className="font-mono-code text-[#F1F3F9] font-medium">
                    48,200 / 100,000 (48.2%)
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232733]">
                  <div className="bg-[#7C5CFF] h-2 rounded-full w-[48.2%]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#8A92A6]">Burst Concurrency</span>
                  <span className="font-mono-code text-[#10B981] font-medium">
                    14 / 100 req/sec
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232733]">
                  <div className="bg-[#10B981] h-2 rounded-full w-[14%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#232733] text-[11px] text-[#8A92A6]">
            Quota resets on the 1st of each month. Upgrades available in Settings.
          </div>
        </div>

        {/* Right: Code Samples with Tabs (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[#12151C] border border-[#232733]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[#7C5CFF]" />
              <h3 className="text-sm font-semibold text-[#F1F3F9]">Integration Code Snippets</h3>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-lg border border-[#232733]">
              {(['curl', 'js', 'python'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCodeTab(tab)}
                  className={`px-3 py-1 rounded text-xs font-mono-code transition-colors ${
                    activeCodeTab === tab
                      ? 'bg-[#7C5CFF] text-white font-semibold'
                      : 'text-[#8A92A6] hover:text-[#F1F3F9]'
                  }`}
                >
                  {tab === 'curl' ? 'cURL' : tab === 'js' ? 'JavaScript' : 'Python'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs font-mono-code text-[#E5E7EB] overflow-x-auto leading-relaxed max-h-72">
              {codeSamples[activeCodeTab]}
            </pre>
            <button
              onClick={handleCopyCode}
              className="absolute top-3 right-3 px-2.5 py-1 rounded bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs font-medium text-[#8A92A6] hover:text-[#F1F3F9] flex items-center gap-1.5 transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#10B981]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Create Key Modal (with One-Time Reveal) */}
      {isCreateKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-[#12151C] border border-[#232733] rounded-xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#232733]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#7C5CFF]/15 text-[#7C5CFF]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#F1F3F9]">
                  {revealedKey ? 'API Key Generated' : 'Create New API Key'}
                </h3>
              </div>
              <button
                onClick={handleCloseCreateModal}
                className="text-[#8A92A6] hover:text-[#F1F3F9] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!revealedKey ? (
              <form onSubmit={handleGenerateKey} className="pt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#F1F3F9] block mb-1.5">
                    Key Description / Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Cluster Backend"
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
                  />
                  <p className="text-[11px] text-[#8A92A6] mt-1">
                    Choose a descriptive name to track where this key is deployed.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="px-3.5 py-1.5 rounded-lg bg-[#181C26] text-xs font-medium text-[#8A92A6] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white shadow-sm shadow-[#7C5CFF]/30"
                  >
                    Generate key
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-4 space-y-4">
                {/* One-time Warning Box */}
                <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#F59E0B] leading-relaxed">
                    <span className="font-semibold">Copy this key now.</span> You will not be able to see it again after closing this window.
                  </p>
                </div>

                {/* Monospace Full Key Display */}
                <div>
                  <label className="text-[11px] font-mono-code uppercase text-[#8A92A6] block mb-1">
                    Continuum Gateway Secret Key
                  </label>
                  <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#232733] flex items-center justify-between gap-2">
                    <code className="text-xs font-mono-code text-[#BFD4FF] select-all break-all">
                      {revealedKey}
                    </code>
                    <button
                      onClick={handleCopyRevealedKey}
                      className="px-3 py-1.5 rounded bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-medium text-white flex items-center gap-1.5 shrink-0"
                    >
                      {copiedRevealedKey ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 rounded-lg bg-[#181C26] hover:bg-[#1E2330] text-xs font-semibold text-[#F1F3F9]"
                  >
                    I have copied it securely
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {revokeCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-[#12151C] border border-[#232733] rounded-xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F3F9] mb-1">
              Revoke key "{revokeCandidate.name}"?
            </h3>
            <p className="text-xs text-[#8A92A6] leading-relaxed mb-4">
              Any application using this key will immediately receive 401 Unauthorized errors.
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRevokeCandidate(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] text-xs font-medium text-[#8A92A6] hover:text-[#F1F3F9]"
              >
                Keep active
              </button>
              <button
                onClick={() => {
                  revokeApiKey(revokeCandidate.id);
                  setRevokeCandidate(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-xs font-semibold text-white"
              >
                Yes, revoke key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
