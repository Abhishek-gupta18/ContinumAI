import React, { useState, useEffect } from 'react';
import { listTokens, createToken, revokeToken, GatewayToken } from '../../api';
import { Copy, Check, X } from 'lucide-react';

export const GatewayTokensPage: React.FC = () => {
  const [tokens, setTokens] = useState<GatewayToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await listTokens();
    setTokens(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    const res = await createToken(tokenName);
    setGeneratedSecret(res.secretKey);
    setTokenName('');
    await load();
  };

  const handleCopy = () => {
    if (!generatedSecret) return;
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    await revokeToken(id);
    await load();
    setFeedback('Token revoked successfully.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2455]">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#EEEAF7] tracking-tight">
            Gateway bearer tokens
          </h1>
          <p className="mt-1 text-xs text-[#9C98B8] font-body max-w-[65ch]">
            Bearer tokens authenticate external pipelines, scripts, and agent loops to the ContinumAI routing engine.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setGeneratedSecret(null);
          }}
          className="px-5 py-2 rounded-full text-xs font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors shrink-0"
        >
          Generate token
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-[#2A2455] border border-[#BFD4FF]/50 text-xs font-mono-code text-[#EEEAF7] flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#9C98B8] hover:text-[#EEEAF7]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Generated Token Banner (1-time view) */}
      {generatedSecret && (
        <div className="p-4 rounded-lg bg-[#2A2455] border border-[#BFD4FF]/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#EEEAF7]">
            <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
            <span>New gateway secret (shown once only)</span>
          </div>
          <p className="text-xs text-[#9C98B8]">
            Copy this bearer token now. It will never be displayed in plaintext again.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <code className="flex-1 px-3 py-2 rounded-md bg-[#14122B] border border-[#2A2455] text-xs font-mono-code text-[#BFD4FF] select-all overflow-x-auto">
              {generatedSecret}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-full bg-[#BFD4FF] text-[#14122B] text-xs font-semibold hover:bg-white transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9C98B8]">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#14122B] border border-[#2A2455] text-center text-xs text-[#9C98B8]">
            No gateway tokens created yet.
          </div>
        ) : (
          tokens.map((tok) => (
            <div
              key={tok.id}
              className="p-4 rounded-lg bg-[#14122B] border border-[#2A2455] flex items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-xs text-[#EEEAF7]">{tok.name}</h3>
                  <span className="font-mono-code text-[11px] px-2 py-0.5 rounded bg-[#2A2455] text-[#BFD4FF]">
                    {tok.maskedToken}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#9C98B8] font-mono-code">
                  <span>Created {new Date(tok.createdAt).toLocaleDateString()}</span>
                  <span>
                    Last active: {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRevoke(tok.id)}
                className="px-3 py-1 rounded-full text-xs text-rose-300 hover:bg-[#2A2455] transition-colors"
                title="Revoke token"
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14122B]/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#14122B] border border-[#2A2455] rounded-lg p-6 space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A2455]">
              <h3 className="font-display font-bold text-base text-[#EEEAF7]">Generate gateway bearer token</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#9C98B8] hover:text-[#EEEAF7]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#9C98B8] font-body">
              Provide a clear label indicating which environment or service will authenticate with this token.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                  Token label
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Production Cluster Relay"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-xs text-[#EEEAF7] focus:outline-none focus:border-[#BFD4FF]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#9C98B8] hover:text-[#EEEAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
