import React from 'react';
import { Link } from 'react-router-dom';

export const HowItWorksSteps: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-b border-[#2A2455]">
      {/* Header: left-aligned, calm, Syne display */}
      <div className="mb-14 text-left max-w-2xl">
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#EEEAF7] tracking-tight leading-tight">
          How it works
        </h2>
        <p className="mt-3 text-base text-[#9C98B8] font-body leading-relaxed max-w-[65ch]">
          Three steps to resilient continuity. No complex orchestration code or custom retries required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="w-8 h-8 rounded-full border border-[#F0A35E] flex items-center justify-center text-xs font-mono-code text-[#F0A35E] glow-gpt">
                1
              </span>
              <span className="text-xs text-[#9C98B8] font-body">Keys</span>
            </div>
            <h3 className="font-display font-bold text-xl text-[#EEEAF7] mb-2 tracking-tight">
              Add your keys
            </h3>
            <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
              Provide your API credentials for OpenAI, Gemini, Claude, and OpenRouter in a write-only vault. Reorder priorities to define your desired failover sequence.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-[#2A2455] text-xs text-[#9C98B8]">
            Never persisted in local state or bundles
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="w-8 h-8 rounded-full border border-[#BFD4FF] flex items-center justify-center text-xs font-mono-code text-[#BFD4FF] glow-gemini">
                2
              </span>
              <span className="text-xs text-[#9C98B8] font-body">Relay</span>
            </div>
            <h3 className="font-display font-bold text-xl text-[#EEEAF7] mb-2 tracking-tight">
              Send requests
            </h3>
            <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
              Run conversations through the workspace or standard HTTP endpoints. If one model exhausts its quota or encounters errors, the next picks up without losing state.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-[#2A2455] text-xs text-[#9C98B8]">
            Sub-40ms automatic switchover
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-6 rounded-lg bg-[#14122B] border border-[#2A2455] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="w-8 h-8 rounded-full border border-[#E58AB0] flex items-center justify-center text-xs font-mono-code text-[#E58AB0] glow-claude">
                3
              </span>
              <span className="text-xs text-[#9C98B8] font-body">Memory</span>
            </div>
            <h3 className="font-display font-bold text-xl text-[#EEEAF7] mb-2 tracking-tight">
              Inspect memory graph
            </h3>
            <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[60ch]">
              View the continuous thread of thought across all participating models. Explore decision branches, checkpoints, and model attribution in real time.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-[#2A2455] text-xs text-[#9C98B8]">
            Full historical auditability per turn
          </div>
        </div>
      </div>

      <div className="mt-12 text-left">
        <Link
          to="/onboarding"
          className="inline-flex px-6 py-2.5 rounded-full text-sm font-medium bg-[#2A2455] hover:bg-[#342d6a] text-[#EEEAF7] transition-colors"
        >
          Follow the setup guide
        </Link>
      </div>
    </section>
  );
};
