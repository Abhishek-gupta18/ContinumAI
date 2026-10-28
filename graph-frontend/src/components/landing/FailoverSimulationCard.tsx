import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Session } from '../../types';
import { ColonyCanvasView } from '../ColonyCanvasView';

interface FailoverSimulationCardProps {
  session: Session;
}

export const FailoverSimulationCard: React.FC<FailoverSimulationCardProps> = ({ session }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('cp-colony-1');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [lastEvent, setLastEvent] = useState<{
    message: string;
    model: string;
    latency: number;
    failedModel?: string;
  }>({
    message: 'OpenAI reached token quota. Gemini continued thought with complete memory.',
    model: 'Gemini',
    latency: 28,
    failedModel: 'OpenAI',
  });

  const handleStepSelect = (step: number) => {
    setActiveStep(step);
    if (step === 0) {
      setSelectedNodeId('turn-1');
      setLastEvent({
        message: 'OpenAI initiated prompt and established initial context tree.',
        model: 'OpenAI',
        latency: 18,
      });
    } else if (step === 1) {
      setSelectedNodeId('turn-2');
      setLastEvent({
        message: 'OpenAI returned 429 rate limit. Gemini picked up thought without interruption.',
        model: 'Gemini',
        latency: 28,
        failedModel: 'OpenAI',
      });
    } else if (step === 2) {
      setSelectedNodeId('turn-3');
      setLastEvent({
        message: 'Context length reached limit. Claude resumed with full state.',
        model: 'Claude',
        latency: 34,
        failedModel: 'Gemini',
      });
    } else {
      setSelectedNodeId('turn-4');
      setLastEvent({
        message: 'OpenRouter routing active across high-throughput endpoints.',
        model: 'OpenRouter',
        latency: 22,
      });
    }
  };

  return (
    <div id="thread-demo" className="mt-16 max-w-6xl mx-auto px-6 lg:px-8">
      {/* Section Header */}
      <div className="mb-6 text-left">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#EEEAF7] tracking-tight">
          The unbroken thread
        </h2>
        <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[65ch]">
          One memory across every model. When an API key hits a rate limit or runs out of tokens, the conversation does not stop: the next light turns on along the same thread.
        </p>
      </div>

      <div className="rounded-lg border border-[#2A2455] bg-[#14122B] overflow-hidden">
        {/* Unbroken Thread of Light Navigation Ribbon */}
        <div className="px-6 py-5 bg-[#14122B] border-b border-[#2A2455]">
          <div className="relative">
            {/* The continuous thread line */}
            <div className="absolute top-3.5 left-4 right-4 h-[2px] bg-[#2A2455]" />
            <div
              className="absolute top-3.5 left-4 h-[2px] bg-[#BFD4FF] transition-all duration-500 glow-thread"
              style={{ width: `${(activeStep / 3) * 100}%` }}
            />

            <div className="relative flex justify-between items-start">
              {/* Point 1: OpenAI */}
              <button
                type="button"
                onClick={() => handleStepSelect(0)}
                className="flex flex-col items-center group cursor-pointer text-left focus:outline-none"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeStep === 0
                      ? 'bg-[#F0A35E] glow-gpt ring-4 ring-[#F0A35E]/20'
                      : 'bg-[#14122B] border border-[#F0A35E]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeStep === 0 ? 'bg-[#14122B]' : 'bg-[#F0A35E]'}`} />
                </span>
                <span className="mt-2 text-xs font-medium text-[#EEEAF7]">Turn 1</span>
                <span className="text-[11px] text-[#9C98B8]">OpenAI</span>
              </button>

              {/* Point 2: Failover to Gemini */}
              <button
                type="button"
                onClick={() => handleStepSelect(1)}
                className="flex flex-col items-center group cursor-pointer text-left focus:outline-none"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeStep === 1
                      ? 'bg-[#BFD4FF] glow-gemini ring-4 ring-[#BFD4FF]/20'
                      : 'bg-[#14122B] border border-[#BFD4FF]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeStep === 1 ? 'bg-[#14122B]' : 'bg-[#BFD4FF]'}`} />
                </span>
                <span className="mt-2 text-xs font-medium text-[#EEEAF7]">Turn 2 (failover)</span>
                <span className="text-[11px] text-[#9C98B8]">Gemini</span>
              </button>

              {/* Point 3: Cascade to Claude */}
              <button
                type="button"
                onClick={() => handleStepSelect(2)}
                className="flex flex-col items-center group cursor-pointer text-left focus:outline-none"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeStep === 2
                      ? 'bg-[#E58AB0] glow-claude ring-4 ring-[#E58AB0]/20'
                      : 'bg-[#14122B] border border-[#E58AB0]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeStep === 2 ? 'bg-[#14122B]' : 'bg-[#E58AB0]'}`} />
                </span>
                <span className="mt-2 text-xs font-medium text-[#EEEAF7]">Turn 3 (continuation)</span>
                <span className="text-[11px] text-[#9C98B8]">Claude</span>
              </button>

              {/* Point 4: OpenRouter */}
              <button
                type="button"
                onClick={() => handleStepSelect(3)}
                className="flex flex-col items-center group cursor-pointer text-left focus:outline-none"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    activeStep === 3
                      ? 'bg-[#9BE3C4] glow-openrouter ring-4 ring-[#9BE3C4]/20'
                      : 'bg-[#14122B] border border-[#9BE3C4]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeStep === 3 ? 'bg-[#14122B]' : 'bg-[#9BE3C4]'}`} />
                </span>
                <span className="mt-2 text-xs font-medium text-[#EEEAF7]">Turn 4 (checkpoint)</span>
                <span className="text-[11px] text-[#9C98B8]">OpenRouter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Line: Event Log */}
        <div className="px-6 py-3 bg-[#14122B] border-b border-[#2A2455] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
            <span className="text-[#EEEAF7] font-body">
              {lastEvent.message}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono-code text-[#9C98B8]">
            {lastEvent.failedModel && (
              <span className="text-[#F0A35E]">failed: {lastEvent.failedModel}</span>
            )}
            <span className="text-[#BFD4FF]">answered: {lastEvent.model}</span>
            <span className="text-[#EEEAF7]">relay {lastEvent.latency}ms</span>
          </div>
        </div>

        {/* Colony Canvas Visual Area */}
        <div className="h-[460px] relative bg-[#14122B]">
          <ColonyCanvasView
            session={session}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
          />

          {/* Minimal Calm Legend */}
          <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-[#14122B]/95 border border-[#2A2455] text-xs space-y-1.5 pointer-events-none">
            <div className="text-xs font-medium text-[#EEEAF7] mb-1 font-display">
              Memory graph legend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F0A35E] glow-gpt" />
              <span className="text-[#9C98B8]">GPT turn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
              <span className="text-[#9C98B8]">Gemini turn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E58AB0] glow-claude" />
              <span className="text-[#9C98B8]">Claude turn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9BE3C4] glow-openrouter" />
              <span className="text-[#9C98B8]">OpenRouter turn</span>
            </div>
          </div>

          {/* Direct Link to Workspace */}
          <div className="absolute bottom-4 right-4">
            <Link
              to="/app"
              className="px-5 py-2 rounded-full bg-[#2A2455] hover:bg-[#342d6a] text-[#EEEAF7] text-xs font-medium transition-colors"
            >
              Open live workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
