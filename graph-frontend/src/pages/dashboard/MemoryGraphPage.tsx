import React from 'react';
import { KnowledgeGlobeBackground } from '../../components/KnowledgeGlobeBackground';

export const MemoryGraphPage: React.FC = () => {
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
            Shared Memory Graph
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] mt-1">
            Obsidian-style linked memory chains. Nodes retain full conversational context across model failovers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-code text-[#BFD4FF] bg-[#12151C] border border-[#232733] px-2.5 py-1 rounded-lg">
            19 Memory Nodes
          </span>
        </div>
      </div>

      {/* Full-bleed Spatial Knowledge Globe Window */}
      <div className="relative flex-1 min-h-[640px] rounded-xl overflow-hidden border border-[#232733] bg-[#080A12]">
        <KnowledgeGlobeBackground />
      </div>
    </div>
  );
};
