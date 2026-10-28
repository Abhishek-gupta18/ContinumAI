import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  Send,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Milestone,
  Copy,
  Check,
  Bot,
  User,
  Shield,
  Loader2,
} from 'lucide-react';
import { PROVIDER_THEMES } from '../../data/dashboardData';
import { ProviderId } from '../../types/dashboard';
import { sendChat } from '../../api/client';
import { ApiError } from '../../api/client';

interface PlaygroundMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  latencySeconds?: number;
  failoverInfo?: {
    failedProvider: string;
    errorCode: string;
    switchedTo: string;
    details: string;
  };
}

const INITIAL_MESSAGES: PlaygroundMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Review our distributed cache failover strategy when replication lag exceeds 200ms.',
    timestamp: '10:14 AM',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `When replication lag exceeds 200ms in a distributed cache topology, executing synchronous cutover risks split-brain or stale writes. 

Recommended mitigation:
1. Promote read-only fencing tokens on the lagging secondary.
2. Ingest stream write-ahead logs via asynchronous mirroring.
3. Once lag delta drops below 5ms, execute atomic sentinel promotion.`,
    timestamp: '10:14 AM',
    modelUsed: 'OpenAI (GPT-4o)',
    latencySeconds: 0.9,
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'Write the failover watchdog script to monitor shard heartbeats and alert PagerDuty.',
    timestamp: '10:16 AM',
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: `Here is the automated shard watchdog implementation with integrated jitter backoff and atomic sentinel voting:

\`\`\`typescript
import { createClient } from 'redis';

export async function checkShardQuorum(shardEndpoints: string[]) {
  const healthyNodes = [];
  for (const endpoint of shardEndpoints) {
    try {
      const client = createClient({ url: endpoint });
      const latency = await pingWithTimeout(client, 150);
      if (latency < 200) healthyNodes.push(endpoint);
    } catch (err) {
      // Primary failed - Continuum gateway automatically hands over memory context
    }
  }
  return healthyNodes.length >= 2;
}
\`\`\`

The watchdog guarantees zero-loss failover while shared memory state preserves the previous turn's replication parameters.`,
    timestamp: '10:16 AM',
    modelUsed: 'Google Gemini (Gemini 2.5 Flash)',
    latencySeconds: 1.2,
    failoverInfo: {
      failedProvider: 'OpenAI',
      errorCode: 'rate_limit_error',
      switchedTo: 'Google Gemini',
      details: 'OpenAI hit 429 Too Many Requests (TPM quota reached). Switched to Gemini without context loss.',
    },
  },
];

export const PlaygroundPage: React.FC = () => {
  const { selectedSessionId, addToast, simulateFailover } = useDashboard();
  const [messages, setMessages] = useState<PlaygroundMessage[]>(INITIAL_MESSAGES);
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedRouting, setSelectedRouting] = useState<'auto' | ProviderId>('auto');
  const [simulateFailoverOnNext, setSimulateFailoverOnNext] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedFailoverId, setExpandedFailoverId] = useState<string | null>('msg-4');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;

    const userText = inputPrompt;
    const startedAt = Date.now();
    const userMsg: PlaygroundMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsGenerating(true);

    // Real gateway call: POST /chat with failover handled by the backend chain.
    try {
      const resp = await sendChat(
        selectedSessionId,
        userText,
        selectedRouting !== 'auto' && selectedRouting !== 'custom' ? selectedRouting : undefined
      );
      const latencySeconds = Math.round(((Date.now() - startedAt) / 100) / 10);
      const assistantMsg: PlaygroundMessage = {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: resp.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: resp.model_used,
        latencySeconds,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `Gateway returned ${err.status}: ${err.message}`
          : 'Unable to reach the ContinumAI backend. Is the gateway running on :3000?';
      addToast({ type: 'error', title: 'Chat request failed', description: message });
      const errorMsg: PlaygroundMessage = {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gateway-error',
        latencySeconds: 0,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetChat = () => {
    setMessages(INITIAL_MESSAGES);
    addToast({
      type: 'info',
      title: 'Playground reset',
      description: 'Conversation chain restored to sample state.',
    });
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
            AI Playground & Live Failover Test
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] mt-1">
            Test chat sessions through the Continuum gateway. Watch silent provider failovers live in action.
          </p>
        </div>

        <button
          onClick={handleResetChat}
          className="px-3 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs text-[#8A92A6] hover:text-[#F1F3F9] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset thread</span>
        </button>
      </div>

      {/* Main Grid: Chat Thread (Left 8 cols) | Right Side Sheet (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
        {/* Center: Message Thread & Composer (8 cols) */}
        <div className="lg:col-span-8 bg-[#12151C] border border-[#232733] rounded-xl flex flex-col overflow-hidden">
          {/* Chat Messages Scrollable Box */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const hasFailover = !!msg.failoverInfo;
              const isFailoverExpanded = expandedFailoverId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                      isUser
                        ? 'bg-gradient-to-tr from-[#7C5CFF] to-[#3B82F6] text-white'
                        : 'bg-[#181C26] border border-[#232733] text-[#7C5CFF]'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble Content */}
                  <div className={`space-y-1.5 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
                    {/* Header info / Badge */}
                    <div className={`flex items-center gap-2 text-[11px] ${isUser ? 'justify-end' : ''}`}>
                      <span className="text-[#8A92A6]">{msg.timestamp}</span>

                      {!isUser && msg.modelUsed && (
                        <span className="px-2 py-0.5 rounded-full font-mono-code text-[10px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          Answered by {msg.modelUsed} • {msg.latencySeconds}s
                        </span>
                      )}
                    </div>

                    {/* Expandable Failover Banner (if failover happened on this message) */}
                    {!isUser && hasFailover && (
                      <div className="rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 overflow-hidden text-xs">
                        <button
                          onClick={() =>
                            setExpandedFailoverId(isFailoverExpanded ? null : msg.id)
                          }
                          className="w-full text-left px-3 py-2 flex items-center justify-between text-[#F59E0B] font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            <span>
                              {msg.failoverInfo?.failedProvider} failed ({msg.failoverInfo?.errorCode}), switched to {msg.failoverInfo?.switchedTo}
                            </span>
                          </div>
                          {isFailoverExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isFailoverExpanded && (
                          <div className="px-3 pb-2.5 pt-1 text-[11px] text-[#8A92A6] border-t border-[#F59E0B]/20 leading-relaxed">
                            {msg.failoverInfo?.details}
                            <div className="mt-1 font-mono-code text-[#BFD4FF]">
                              Memory context preserved: Turn tokens transferred without loss.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Bubble Body */}
                    <div
                      className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#7C5CFF] text-white rounded-tr-none'
                          : 'bg-[#0B0D12] border border-[#232733] text-[#F1F3F9] rounded-tl-none font-mono-code text-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Copy button */}
                      <div className="flex justify-end mt-2 pt-1.5 border-t border-white/10">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="text-[10px] text-[#8A92A6] hover:text-white flex items-center gap-1 transition-colors"
                        >
                          {copiedIndex === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#10B981]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex items-center gap-3 text-xs text-[#8A92A6] animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[#181C26] flex items-center justify-center text-[#7C5CFF]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <span>Continuum Gateway evaluating provider priority chain...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Composer & Controls at Bottom */}
          <div className="p-3.5 border-t border-[#232733] bg-[#0B0D12]/70 space-y-2.5">
            {/* Top controls: Routing selector & failover toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#8A92A6]">Route:</span>
                <select
                  value={selectedRouting}
                  onChange={(e) => setSelectedRouting(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-[#12151C] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                >
                  <option value="auto">Auto (priority order failover)</option>
                  <option value="openai">Force OpenAI (GPT-4o)</option>
                  <option value="gemini">Force Gemini (Gemini 2.5 Flash)</option>
                  <option value="claude">Force Claude (Claude 3.7 Sonnet)</option>
                  <option value="nvidia">Force NVIDIA NIM</option>
                </select>
              </div>

              {/* Failover simulator checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-[#8A92A6] hover:text-[#F1F3F9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateFailoverOnNext}
                  onChange={(e) => setSimulateFailoverOnNext(e.target.checked)}
                  className="rounded bg-[#12151C] border-[#232733] text-[#7C5CFF] focus:ring-0"
                />
                <span className="text-[#F59E0B] font-medium">Trigger 429 failover test</span>
              </label>
            </div>

            {/* Prompt Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask Continuum gateway... (e.g. Continue failover test)"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#12151C] border border-[#232733] text-xs sm:text-sm text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isGenerating}
                className="px-4 py-2.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] disabled:opacity-40 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-sm shadow-[#7C5CFF]/30 shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side Sheet: Session details, Node count, Checkpoint summary (4 cols) */}
        <div className="lg:col-span-4 bg-[#12151C] border border-[#232733] rounded-xl flex flex-col p-5 space-y-5 overflow-y-auto">
          <div>
            <span className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1 font-mono-code">
              Gateway Session Context
            </span>
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#232733]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#8A92A6]">Session ID:</span>
                <span className="font-mono-code text-[#BFD4FF] font-medium truncate max-w-[150px]">
                  {selectedSessionId}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A92A6]">Active Nodes:</span>
                <span className="font-mono-code text-[#10B981] font-semibold">
                  {messages.length} turns in chain
                </span>
              </div>
            </div>
          </div>

          {/* Current Checkpoint Summary */}
          <div>
            <span className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1.5 font-mono-code flex items-center gap-1.5">
              <Milestone className="w-3.5 h-3.5 text-[#BFD4FF]" />
              Current Checkpoint Summary
            </span>
            <div className="p-3.5 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#E5E7EB] space-y-2 leading-relaxed">
              <p className="font-semibold text-[#BFD4FF]">
                Snapshot #cp-checkpoint-redis-v2
              </p>
              <p className="text-[#8A92A6] text-[11px]">
                Replication lag monitored at 200ms. Distributed watchdog scripts initialized across multi-region quorums.
              </p>
              <div className="pt-2 border-t border-[#232733] text-[10px] font-mono-code text-[#10B981] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Immutable context frozen • Compressed 74%
              </div>
            </div>
          </div>

          {/* Token Metrics & Gateway Savings */}
          <div>
            <span className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1.5 font-mono-code">
              Token & Fallback Metrics
            </span>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232733] flex items-center justify-between">
                <span className="text-[#8A92A6]">Prompt Tokens:</span>
                <span className="font-mono-code text-[#F1F3F9]">2,410</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232733] flex items-center justify-between">
                <span className="text-[#8A92A6]">Completion Tokens:</span>
                <span className="font-mono-code text-[#F1F3F9]">840</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#232733] flex items-center justify-between">
                <span className="text-[#8A92A6]">Handoff Cost Saved:</span>
                <span className="font-mono-code text-[#10B981] font-semibold">100% (No dropped context)</span>
              </div>
            </div>
          </div>

          {/* Gateway guarantee banner */}
          <div className="p-3 rounded-lg bg-[#7C5CFF]/10 border border-[#7C5CFF]/30 text-xs text-[#BFD4FF] leading-relaxed">
            <Shield className="w-3.5 h-3.5 text-[#7C5CFF] mb-1" />
            <span className="font-medium text-white">Continuous Memory Guarantee: </span>
            Neither tokens nor session history are lost during automatic provider failover.
          </div>
        </div>
      </div>
    </div>
  );
};
