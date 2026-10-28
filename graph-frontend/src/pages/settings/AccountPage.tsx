import React from 'react';
import { useAuth } from '../../auth';

export const AccountPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      {/* Page Title */}
      <div className="pb-4 border-b border-[#2A2455]">
        <h1 className="font-display font-bold text-2xl text-[#EEEAF7] tracking-tight">
          Account & usage telemetry
        </h1>
        <p className="mt-1 text-xs text-[#9C98B8] font-body max-w-[65ch]">
          Developer profile, failover statistics, and multi-model traffic distribution.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] space-y-4">
        <h2 className="text-xs font-medium text-[#9C98B8]">
          Developer identity
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#2A2455] border border-[#BFD4FF]/40 flex items-center justify-center text-lg font-mono-code font-bold text-[#BFD4FF]">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-[#EEEAF7]">{user?.name}</h3>
            <p className="text-xs font-mono-code text-[#9C98B8]">{user?.email}</p>
            <div className="flex items-center gap-3 pt-1 text-xs text-[#9C98B8]">
              <span className="px-2 py-0.5 rounded-full bg-[#2A2455] text-[#EEEAF7]">
                Developer tier
              </span>
              <span>Active relay member</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Telemetry & Failover Metrics */}
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-[#9C98B8]">
          Gateway telemetry
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#14122B] border border-[#2A2455]">
            <div className="text-xs text-[#9C98B8] mb-1">Total turns routed</div>
            <div className="text-2xl font-bold font-mono-code text-[#EEEAF7]">1,420</div>
            <div className="text-[11px] text-[#BFD4FF] mt-1">Unbroken continuity</div>
          </div>

          <div className="p-4 rounded-lg bg-[#14122B] border border-[#2A2455]">
            <div className="text-xs text-[#9C98B8] mb-1">Failovers mitigated</div>
            <div className="text-2xl font-bold font-mono-code text-[#F0A35E]">38</div>
            <div className="text-[11px] text-[#9C98B8] mt-1">Automatic handover</div>
          </div>

          <div className="p-4 rounded-lg bg-[#14122B] border border-[#2A2455]">
            <div className="text-xs text-[#9C98B8] mb-1">Context retention</div>
            <div className="text-2xl font-bold font-mono-code text-[#BFD4FF]">99.8%</div>
            <div className="text-[11px] text-[#9C98B8] mt-1">Zero dropped threads</div>
          </div>

          <div className="p-4 rounded-lg bg-[#14122B] border border-[#2A2455]">
            <div className="text-xs text-[#9C98B8] mb-1">Relay latency</div>
            <div className="text-2xl font-bold font-mono-code text-[#EEEAF7]">34ms</div>
            <div className="text-[11px] text-[#9C98B8] mt-1">P99 switchover time</div>
          </div>
        </div>

        {/* Breakdown by provider */}
        <div className="p-5 rounded-lg bg-[#14122B] border border-[#2A2455] space-y-4">
          <h3 className="text-xs font-medium text-[#EEEAF7]">Traffic distribution across providers</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-mono-code">
                <span className="flex items-center gap-2 text-[#EEEAF7]">
                  <span className="w-2 h-2 rounded-full bg-[#F0A35E] glow-gpt" />
                  <span>OpenAI (GPT-4o)</span>
                </span>
                <span className="text-[#9C98B8]">820 reqs (57.7%)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#2A2455] overflow-hidden">
                <div className="h-full bg-[#F0A35E] rounded-full" style={{ width: '57.7%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-mono-code">
                <span className="flex items-center gap-2 text-[#EEEAF7]">
                  <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
                  <span>Google Gemini (1.5 Pro)</span>
                </span>
                <span className="text-[#9C98B8]">410 reqs (28.9%)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#2A2455] overflow-hidden">
                <div className="h-full bg-[#BFD4FF] rounded-full" style={{ width: '28.9%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-mono-code">
                <span className="flex items-center gap-2 text-[#EEEAF7]">
                  <span className="w-2 h-2 rounded-full bg-[#E58AB0] glow-claude" />
                  <span>Anthropic Claude (3.5 Sonnet)</span>
                </span>
                <span className="text-[#9C98B8]">190 reqs (13.4%)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#2A2455] overflow-hidden">
                <div className="h-full bg-[#E58AB0] rounded-full" style={{ width: '13.4%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="p-5 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-medium text-[#EEEAF7]">Sign out of session</h4>
          <p className="text-xs text-[#9C98B8]">End the active browser authentication session.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-5 py-2 rounded-full text-xs font-medium text-rose-300 hover:bg-[#2A2455] border border-rose-500/30 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};
