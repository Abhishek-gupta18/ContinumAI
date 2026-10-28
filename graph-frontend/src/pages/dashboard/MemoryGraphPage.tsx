import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { MOCK_SESSIONS } from '../../data/mockSessions';
import { Session } from '../../types';
import { PROVIDER_THEMES } from '../../data/dashboardData';
import { ProviderId } from '../../types/dashboard';
import {
  Search,
  Filter,
  Milestone,
  Clock,
  AlertOctagon,
} from 'lucide-react';

import { GraphView } from '../../components/GraphView';

export const MemoryGraphPage: React.FC = () => {
  const { selectedSessionId, setSelectedSessionId } = useDashboard();
  const [sessionSearch, setSessionSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Filters
  const [selectedProviders, setSelectedProviders] = useState<Record<string, boolean>>({
    openai: true,
    gemini: true,
    claude: true,
    gpt: true,
    nvidia: true,
    custom: true,
  });
  const [checkpointsOnly, setCheckpointsOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('all');

  // Active Session
  const activeSession: Session = useMemo(() => {
    return MOCK_SESSIONS.find((s) => s.id === selectedSessionId) || MOCK_SESSIONS[0];
  }, [selectedSessionId]);

  // Filtered session passed to the graph
  const filteredSession: Session = useMemo(() => {
    let nodes = activeSession.nodes || [];
    if (checkpointsOnly) {
      nodes = nodes.filter((n) => n.type === 'checkpoint');
    }
    nodes = nodes.filter((node) => {
      const modelLower = (node.model_used || '').toLowerCase();
      let key = 'custom';
      if (modelLower.includes('gpt') || modelLower.includes('openai')) key = 'openai';
      else if (modelLower.includes('gemini')) key = 'gemini';
      else if (modelLower.includes('claude')) key = 'claude';
      else if (modelLower.includes('nvidia')) key = 'nvidia';

      if (selectedProviders[key] === false && selectedProviders['gpt'] === false) return false;
      return true;
    });

    return {
      ...activeSession,
      nodes: nodes.length > 0 ? nodes : activeSession.nodes,
    };
  }, [activeSession, checkpointsOnly, selectedProviders]);

  const selectedNode = useMemo(() => {
    const list = filteredSession.nodes || activeSession.nodes || [];
    if (!list.length) return null;
    return list.find((n) => n.node_id === selectedNodeId) || list[0];
  }, [filteredSession.nodes, activeSession.nodes, selectedNodeId]);

  // Set initial selected node
  useEffect(() => {
    if (filteredSession.nodes.length > 0 && !selectedNodeId) {
      const interesting = filteredSession.nodes.find((n) => n.failed_providers?.length || n.type === 'checkpoint') || filteredSession.nodes[0];
      setSelectedNodeId(interesting.node_id);
    }
  }, [filteredSession.nodes, selectedNodeId]);

  const selectedNodeColor = useMemo(() => {
    if (!selectedNode) return '#BFD4FF';
    const modelLower = (selectedNode.model_used || '').toLowerCase();
    let pKey: ProviderId = 'custom';
    if (modelLower.includes('gpt') || modelLower.includes('openai')) pKey = 'openai';
    else if (modelLower.includes('gemini')) pKey = 'gemini';
    else if (modelLower.includes('claude')) pKey = 'claude';
    else if (modelLower.includes('nvidia') || modelLower.includes('llama')) pKey = 'nvidia';
    return PROVIDER_THEMES[pKey]?.color || '#BFD4FF';
  }, [selectedNode]);

  const filteredSessions = MOCK_SESSIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60">
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
            {activeSession.nodes.length} Memory Nodes
          </span>
        </div>
      </div>

      {/* 3-Panel Workspace: Left Filter Panel (280px) | Full-width Dark Canvas | Right Node Inspector (340px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px]">
        {/* Left Filter Panel (3 cols) */}
        <div className="lg:col-span-3 bg-[#12151C] border border-[#232733] rounded-xl flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-[#232733] bg-[#0B0D12]/50">
            <span className="text-xs font-semibold text-[#F1F3F9] flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#7C5CFF]" />
              Session & Filters
            </span>
          </div>

          <div className="p-3.5 flex-1 overflow-y-auto space-y-4">
            {/* Session Search & Picker */}
            <div>
              <label className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1.5 font-mono-code">
                Select Session
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[#8A92A6] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search session..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredSessions.map((s) => {
                  const isCurrent = s.id === activeSession.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSessionId(s.id);
                        setSelectedNodeId(null);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between group ${
                        isCurrent
                          ? 'bg-[#7C5CFF]/15 border border-[#7C5CFF]/40 text-white'
                          : 'bg-[#0B0D12] border border-[#232733] text-[#8A92A6] hover:text-[#F1F3F9] hover:bg-[#181C26]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium truncate group-hover:text-white">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-[#8A92A6] font-mono-code">{s.id}</p>
                      </div>
                      <span className="text-[10px] font-mono-code bg-[#181C26] px-1.5 py-0.5 rounded text-[#BFD4FF] border border-[#232733] shrink-0">
                        {s.nodes.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider Filter Toggles */}
            <div className="pt-3 border-t border-[#232733]">
              <label className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-2 font-mono-code">
                Provider Filter
              </label>
              <div className="space-y-2">
                {[
                  { key: 'openai', name: 'OpenAI (GPT)', color: '#10B981' },
                  { key: 'gemini', name: 'Google Gemini', color: '#3B82F6' },
                  { key: 'claude', name: 'Anthropic Claude', color: '#F97316' },
                  { key: 'nvidia', name: 'NVIDIA NIM', color: '#84CC16' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-[#F1F3F9] cursor-pointer hover:bg-[#181C26] p-1.5 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedProviders[item.key] !== false}
                      onChange={(e) =>
                        setSelectedProviders((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                          ...(item.key === 'openai' ? { gpt: e.target.checked } : {}),
                        }))
                      }
                      className="rounded bg-[#0B0D12] border-[#232733] text-[#7C5CFF] focus:ring-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Checkpoints Only Toggle */}
            <div className="pt-3 border-t border-[#232733]">
              <label className="flex items-center justify-between text-xs text-[#F1F3F9] cursor-pointer">
                <span className="flex items-center gap-2">
                  <Milestone className="w-3.5 h-3.5 text-[#BFD4FF]" />
                  Show checkpoints only
                </span>
                <input
                  type="checkbox"
                  checked={checkpointsOnly}
                  onChange={(e) => setCheckpointsOnly(e.target.checked)}
                  className="rounded bg-[#0B0D12] border-[#232733] text-[#7C5CFF] focus:ring-0"
                />
              </label>
            </div>

            {/* Time Range Selector */}
            <div className="pt-3 border-t border-[#232733]">
              <label className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1.5 font-mono-code">
                Time Window
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono-code">
                {(['1h', '24h', '7d', 'all'] as const).map((tr) => (
                  <button
                    key={tr}
                    onClick={() => setTimeRange(tr)}
                    className={`py-1 rounded text-center transition-colors ${
                      timeRange === tr
                        ? 'bg-[#7C5CFF] text-white font-semibold'
                        : 'bg-[#0B0D12] border border-[#232733] text-[#8A92A6] hover:text-[#F1F3F9]'
                    }`}
                  >
                    {tr.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Previous Graph View Design (6 cols) */}
        <div className="lg:col-span-6 bg-[#12151C] border border-[#232733] rounded-xl overflow-hidden flex flex-col relative h-full">
          <GraphView
            session={filteredSession}
            selectedNodeId={selectedNode?.node_id ?? null}
            onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          />
        </div>

        {/* Right Inspector Panel for Selected Node (3 cols) */}
        <div className="lg:col-span-3 bg-[#12151C] border border-[#232733] rounded-xl flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-[#232733] bg-[#0B0D12]/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F1F3F9]">Node Inspector</span>
            {selectedNode && (
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-[#0B0D12] text-[#BFD4FF] border border-[#232733]">
                {selectedNode.node_id}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Type, Model, Status Badges */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-mono-code font-semibold"
                    style={{
                      backgroundColor: `${selectedNodeColor}20`,
                      color: selectedNodeColor,
                      border: `1px solid ${selectedNodeColor}40`,
                    }}
                  >
                    {selectedNode.model_used.toUpperCase()}
                  </span>

                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#181C26] text-[#F1F3F9] border border-[#232733] capitalize">
                    {selectedNode.type}
                  </span>

                  {selectedNode.status_at_this_point === 'blocked' ? (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                      Done
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-[#8A92A6] flex items-center gap-1 font-mono-code">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(selectedNode.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Failed Providers List (if failover happened) */}
              {selectedNode.failed_providers && selectedNode.failed_providers.length > 0 && (
                <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">
                  <div className="text-[11px] font-semibold text-[#EF4444] flex items-center gap-1.5 mb-1">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Failover Event Handled
                  </div>
                  <p className="text-[11px] text-[#8A92A6] leading-relaxed">
                    Prior provider{' '}
                    <span className="font-mono-code font-bold text-white">
                      {selectedNode.failed_providers.join(', ').toUpperCase()}
                    </span>{' '}
                    failed. The gateway silently continued the thought on{' '}
                    <span className="font-mono-code font-bold text-white">
                      {selectedNode.model_used.toUpperCase()}
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* User Content Block */}
              <div>
                <label className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1 font-mono-code">
                  User Message / Prompt
                </label>
                <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] leading-relaxed">
                  {selectedNode.content}
                </div>
              </div>

              {/* Assistant Reply Block */}
              <div>
                <label className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1 font-mono-code">
                  Assistant Reply
                </label>
                <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#E5E7EB] leading-relaxed max-h-48 overflow-y-auto font-mono-code text-[11px]">
                  {selectedNode.reply || (
                    <span className="italic text-[#8A92A6]">
                      {selectedNode.status_at_this_point === 'blocked'
                        ? 'Request blocked by safety policy or rate limit.'
                        : 'Checkpoint state frozen without separate completion text.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Lineage: Previous and Next Node Links */}
              <div className="pt-2 border-t border-[#232733]">
                <label className="text-[11px] font-semibold text-[#8A92A6] uppercase tracking-wider block mb-1.5 font-mono-code">
                  Memory Lineage
                </label>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-[#0B0D12] border border-[#232733]">
                    <span className="text-[#8A92A6]">prev_id:</span>
                    {selectedNode.prev_id ? (
                      <button
                        onClick={() => setSelectedNodeId(selectedNode.prev_id)}
                        className="font-mono-code text-[#7C5CFF] hover:underline"
                      >
                        {selectedNode.prev_id}
                      </button>
                    ) : (
                      <span className="font-mono-code text-[#8A92A6]">null (Root)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#8A92A6]">
              Click any node on the graph to inspect its memory turn.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
