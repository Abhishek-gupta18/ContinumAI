import React from 'react';
import { Link } from 'react-router-dom';

export const KeySecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-b border-[#2A2455]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Description */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#EEEAF7] tracking-tight leading-tight">
            Write-only keys. Zero browser storage.
          </h2>

          <p className="text-base text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
            Your credentials stay protected by architectural design. ContinumAI never writes secrets to client-side bundles, local storage, or session storage.
          </p>

          <div className="space-y-4 pt-2 text-sm text-[#9C98B8]">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini mt-2 shrink-0" />
              <div className="max-w-[55ch]">
                <strong className="text-[#EEEAF7] font-medium">Ephemeral in transit:</strong> Keys are submitted directly through secure server interfaces and never returned to the browser in cleartext.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini mt-2 shrink-0" />
              <div className="max-w-[55ch]">
                <strong className="text-[#EEEAF7] font-medium">Masked representation:</strong> After creation, only masked fragments such as <span className="font-mono-code text-[#EEEAF7]">sk-…a1b2</span> are displayed.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini mt-2 shrink-0" />
              <div className="max-w-[55ch]">
                <strong className="text-[#EEEAF7] font-medium">Isolated execution:</strong> Client interfaces call the backend gateway, which signs upstream requests without exposing provider credentials to client runtime memory.
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              to="/app/settings/keys"
              className="inline-flex px-6 py-2.5 rounded-full text-sm font-medium bg-[#2A2455] hover:bg-[#342d6a] text-[#EEEAF7] transition-colors"
            >
              Configure provider keys
            </Link>
          </div>
        </div>

        {/* Right Column: Code Specification */}
        <div className="lg:col-span-6">
          <div className="rounded-lg border border-[#2A2455] bg-[#14122B] overflow-hidden">
            <div className="px-5 py-3 bg-[#14122B] border-b border-[#2A2455] flex items-center justify-between text-xs text-[#9C98B8]">
              <span className="font-mono-code">security-manifest.json</span>
              <span className="text-[#BFD4FF]">write-only</span>
            </div>

            <pre className="p-5 font-mono-code text-xs text-[#EEEAF7]/85 leading-relaxed overflow-x-auto bg-[#14122B]">
{`{
  "vault": "write_only",
  "client_storage": {
    "local_storage": false,
    "session_storage": false,
    "bundle_exposure": false
  },
  "masked_keys": {
    "openai": "sk-…a1b2",
    "gemini": "AIza…9xQ1",
    "claude": "sk-ant-…c3d4",
    "openrouter": "sk-or-…e5f6"
  },
  "cascade_priority": ["gpt", "gemini", "claude", "openrouter"],
  "bearer_auth": "Bearer continum_gw_live_…"
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
