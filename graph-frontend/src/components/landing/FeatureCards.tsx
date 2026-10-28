import React from 'react';

export const FeatureCards: React.FC = () => {
  return (
    <section id="features" className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-b border-[#2A2455]">
      {/* Section Header: left-aligned, calm, Syne display */}
      <div className="mb-14 text-left max-w-2xl">
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#EEEAF7] tracking-tight leading-tight">
          Three principles of continuity
        </h2>
        <p className="mt-3 text-base text-[#9C98B8] font-body leading-relaxed max-w-[65ch]">
          A persistent layer between your calls and the frontier models. The memory stays intact regardless of which engine answers.
        </p>
      </div>

      {/* 3 Feature Cards: flat nightfall, small radius, no shadows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Failover */}
        <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full border border-[#F0A35E]/60 flex items-center justify-center glow-gpt mb-5 bg-[#2A2455]/50">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F0A35E]" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#EEEAF7] mb-2 tracking-tight">
              Failover
            </h3>
            <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
              When a provider hits an HTTP 429 rate limit or unexpected downtime, execution moves to the next configured model in milliseconds without dropping context.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[#2A2455] text-xs text-[#9C98B8] space-y-2">
            <div className="flex items-center justify-between">
              <span>Detection threshold</span>
              <span className="font-mono-code text-[#EEEAF7]">Immediate on error</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cascade sequence</span>
              <span className="font-mono-code text-[#BFD4FF]">Configurable priority</span>
            </div>
          </div>
        </div>

        {/* Card 2: Shared memory chain */}
        <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full border border-[#BFD4FF]/60 flex items-center justify-center glow-gemini mb-5 bg-[#2A2455]/50">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF]" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#EEEAF7] mb-2 tracking-tight">
              Shared memory chain
            </h3>
            <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
              Every turn, decision branch, and colony checkpoint is stored in a unified memory structure so that subsequent models inherit the full line of reasoning.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[#2A2455] text-xs text-[#9C98B8] space-y-2">
            <div className="flex items-center justify-between">
              <span>Memory structure</span>
              <span className="font-mono-code text-[#EEEAF7]">Directed chain</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Branching logic</span>
              <span className="font-mono-code text-[#BFD4FF]">Checkpoint anchors</span>
            </div>
          </div>
        </div>

        {/* Card 3: Bring your own keys */}
        <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full border border-[#E58AB0]/60 flex items-center justify-center glow-claude mb-5 bg-[#2A2455]/50">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E58AB0]" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#EEEAF7] mb-2 tracking-tight">
              Bring your own keys
            </h3>
            <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
              Your keys never reside in client-side bundles or persistent local storage. Key inputs are write-only, displayed only as masked tokens like <span className="font-mono-code text-[#EEEAF7]">sk-…a1b2</span>.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[#2A2455] text-xs text-[#9C98B8] space-y-2">
            <div className="flex items-center justify-between">
              <span>Key retention</span>
              <span className="font-mono-code text-[#EEEAF7]">Write-only vault</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Client exposure</span>
              <span className="font-mono-code text-[#E58AB0]">None</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
