import React, { useState, useRef } from 'react';
import { MemoryNode } from '../types';
import { ChevronUp, ChevronDown, Send } from 'lucide-react';

interface ChatComposerPanelProps {
  sessionId: string;
  latestNode: MemoryNode | null;
  onSendMessage: (message: string, forceFailover: boolean) => Promise<void>;
  isLoading: boolean;
}

export const ChatComposerPanel: React.FC<ChatComposerPanelProps> = ({
  latestNode,
  onSendMessage,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const [forceFailover, setForceFailover] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    await onSendMessage(msg, forceFailover);
  };

  const getProviderDot = (model: string) => {
    const m = model.toLowerCase();
    if (m.includes('openai') || m.includes('gpt')) {
      return { color: '#F0A35E', glow: 'glow-gpt', label: 'GPT' };
    }
    if (m.includes('gemini')) {
      return { color: '#BFD4FF', glow: 'glow-gemini', label: 'Gemini' };
    }
    if (m.includes('claude') || m.includes('anthropic')) {
      return { color: '#E58AB0', glow: 'glow-claude', label: 'Claude' };
    }
    if (m.includes('openrouter')) {
      return { color: '#9BE3C4', glow: 'glow-openrouter', label: 'OpenRouter' };
    }
    return { color: '#EEEAF7', glow: '', label: model };
  };

  const providerInfo = latestNode ? getProviderDot(latestNode.model_used) : null;
  const hasFailover = Boolean(latestNode?.failed_providers && latestNode.failed_providers.length > 0);

  return (
    <div
      id="chat-composer-panel"
      className="border-t border-[#2A2455] bg-[#14122B] shrink-0 z-20"
    >
      {/* Top Status Bar */}
      <div className="h-9 px-4 bg-[#14122B] border-b border-[#2A2455] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display font-bold text-xs text-[#EEEAF7]">
            Memory composer
          </span>

          {latestNode && latestNode.reply && providerInfo && (
            <div className="hidden sm:flex items-center gap-2 truncate pl-3 border-l border-[#2A2455]">
              <span
                className={`w-2 h-2 rounded-full ${providerInfo.glow}`}
                style={{ backgroundColor: providerInfo.color }}
              />
              <span className="text-xs text-[#9C98B8] font-body truncate">
                Answered by {providerInfo.label}
              </span>
              {hasFailover && (
                <span className="text-[11px] font-mono-code text-[#F0A35E]">
                  (failed: {latestNode.failed_providers?.join(', ')})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Failover Simulator Switch */}
          <button
            type="button"
            onClick={() => setForceFailover(!forceFailover)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              forceFailover
                ? 'bg-[#F0A35E] text-[#14122B] glow-gpt font-semibold'
                : 'bg-[#2A2455] text-[#9C98B8] hover:text-[#EEEAF7]'
            }`}
          >
            {forceFailover ? 'Failover active' : 'Simulate 429 failover'}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-full text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
            aria-label={isExpanded ? 'Collapse composer' : 'Expand composer'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Area */}
      {isExpanded && (
        <div className="p-3 max-w-4xl mx-auto space-y-2.5">
          {/* Latest assistant response snippet if present */}
          {latestNode && latestNode.reply && providerInfo && (
            <div className="p-3 rounded-lg bg-[#14122B] border border-[#2A2455] text-xs flex items-start gap-3">
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${providerInfo.glow}`}
                style={{ backgroundColor: providerInfo.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-[#EEEAF7]">
                    Latest reply
                  </span>
                  <span className="font-mono-code text-[11px] text-[#9C98B8]">
                    node {latestNode.node_id}
                  </span>
                </div>
                <p className="text-xs text-[#9C98B8] font-body leading-relaxed line-clamp-2">
                  {latestNode.reply}
                </p>
              </div>
            </div>
          )}

          {/* Composer Input Box */}
          <div className="rounded-lg border border-[#2A2455] bg-[#14122B] focus-within:border-[#BFD4FF] transition-colors">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Send instruction along the memory chain (Enter to send, Shift+Enter for newline)..."
              className="w-full bg-transparent px-3.5 py-2.5 text-xs text-[#EEEAF7] placeholder-[#9C98B8]/60 resize-none focus:outline-none font-body"
            />

            <div className="px-3.5 py-2 border-t border-[#2A2455] flex items-center justify-between">
              <span className="text-xs text-[#9C98B8] font-body">
                Memory thread persists automatically across models
              </span>

              <button
                type="button"
                disabled={!input.trim() || isLoading}
                onClick={handleSubmit}
                className="px-5 py-1.5 rounded-full text-xs font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
