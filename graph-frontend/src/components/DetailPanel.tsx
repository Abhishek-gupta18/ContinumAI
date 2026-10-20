import React, { useState } from 'react';
import { MemoryNode } from '../types';
import { ModelBadge, StatusBadge, providerLabel } from './nodes/Badges';
import {
  Copy,
  Check,
  ChevronRight,
  GitFork,
  BookmarkCheck,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Link2,
  Calendar,
  Layers,
  Sparkles,
  Cpu,
  CornerDownRight,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';

interface DetailPanelProps {
  selectedNode: MemoryNode | null;
  allNodes: MemoryNode[];
  onSelectNode: (nodeId: string) => void;
  onCenterNode?: (nodeId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedNode,
  allNodes,
  onSelectNode,
  onCenterNode,
  collapsed,
  onToggleCollapse,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(selectedNode.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (collapsed) {
    return (
      <aside
        id="obsidian-detail-sidebar-collapsed"
        className="h-full w-12 bg-[#141417] border-l border-[#24242c] flex flex-col items-center py-3 shrink-0"
      >
        <button
          id="expand-detail-btn"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-[#1e1e25] hover:bg-[#282834] text-[#a0a1b5] transition-colors"
          title="Open Node Details"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </aside>
    );
  }

  // Find parent node
  const parentNode = selectedNode?.prev_id
    ? allNodes.find((n) => n.node_id === selectedNode.prev_id)
    : null;

  // Find direct child nodes (for tracking branches)
  const childNodes = selectedNode
    ? allNodes.filter((n) => n.prev_id === selectedNode.node_id)
    : [];

  // Find referenced nodes for decisions
  const referencedNodes = selectedNode?.references
    ? allNodes.filter((n) => selectedNode.references?.includes(n.node_id))
    : [];

  // Detect model handoff - check parent provider, or failed_providers
  const isHandoff =
    (parentNode && parentNode.provider !== selectedNode?.provider && parentNode.provider && selectedNode?.provider) ||
    (selectedNode?.failed_providers && selectedNode.failed_providers.length > 0);

  const handoffInfo = (() => {
    if (!selectedNode) return null;
    // If failed_providers exist, show failover callout
    if (selectedNode.failed_providers && selectedNode.failed_providers.length > 0) {
      const { display: providerDisplay } = providerLabel(selectedNode);
      return {
        from: selectedNode.failed_providers.join(', '),
        to: providerDisplay,
        text: `${selectedNode.failed_providers.join(' > ')} failed (${selectedNode.failed_providers.length} tried), ${providerDisplay} answered`,
      };
    }
    // If parent provider differs
    if (parentNode && parentNode.provider !== selectedNode.provider && parentNode.provider && selectedNode.provider) {
      const { display: parentDisplay } = providerLabel(parentNode);
      const { display: currentDisplay } = providerLabel(selectedNode);
      return {
        from: parentDisplay,
        to: currentDisplay,
        text: `${parentDisplay} failed (1 tried), ${currentDisplay} answered`,
      };
    }
    return null;
  })();

  return (
    <aside
      id="obsidian-detail-sidebar"
      className="h-full w-80 lg:w-96 bg-[#141417] border-l border-[#24242c] flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#24242c] shrink-0 bg-[#17171b]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-[#dcdde7] uppercase tracking-wider">
            Node Inspector
          </span>
          {selectedNode && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#252530] text-indigo-300 font-bold">
              #{selectedNode.node_id}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedNode && onCenterNode && (
            <button
              id="center-selected-node-btn"
              onClick={() => onCenterNode(selectedNode.node_id)}
              className="p-1.5 rounded text-[#7c7d91] hover:text-[#d0d1df] hover:bg-[#22222c] transition-colors"
              title="Focus in Graph"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id="collapse-detail-btn"
            onClick={onToggleCollapse}
            className="p-1.5 rounded text-[#7c7d91] hover:text-[#d0d1df] hover:bg-[#22222c] transition-colors"
            title="Collapse Details Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!selectedNode ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#6e6f80]">
          <div className="w-12 h-12 rounded-full bg-[#1b1b22] border border-[#282834] flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-[#525364]" />
          </div>
          <h4 className="text-sm font-medium text-[#a5a6b8] mb-1">No Node Selected</h4>
          <p className="text-xs text-[#717283] leading-relaxed max-w-[220px]">
            Click any node in the memory graph to inspect its payload, model provider, and references.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Metadata Card */}
          <div className="p-3.5 rounded-xl bg-[#1a1a20] border border-[#272732] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#7d7e92] uppercase tracking-wider">
                Node Type
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
                  selectedNode.type === 'decision'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-700/50'
                    : selectedNode.type === 'checkpoint'
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                    : 'bg-[#262632] text-[#c2c3d4] border border-[#363646]'
                }`}
              >
                {selectedNode.type === 'decision' && <GitFork className="w-3 h-3" />}
                {selectedNode.type === 'checkpoint' && <BookmarkCheck className="w-3 h-3" />}
                {selectedNode.type === 'turn' && <MessageSquare className="w-3 h-3" />}
                <span className="capitalize">{selectedNode.type}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#7d7e92] uppercase tracking-wider">
                Model Provider
              </span>
              <ModelBadge model={selectedNode.model_used} provider={selectedNode.provider} failed_providers={selectedNode.failed_providers} size="md" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#7d7e92] uppercase tracking-wider">
                Execution Status
              </span>
              <StatusBadge status={selectedNode.status_at_this_point} size="md" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#252530] text-[11px] text-[#86879b]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#646577]" /> Timestamp
              </span>
              <span className="font-mono text-[10px] text-[#b0b1c4]">
                {new Date(selectedNode.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Model Handoff / Failover Alert Banner */}
          {handoffInfo && (
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5">
              <div className="p-1 rounded bg-indigo-900/60 text-indigo-300 shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-indigo-200">Gateway Failover / Handoff</p>
                <p className="text-[11px] text-indigo-300/80 leading-relaxed mt-0.5">
                  {handoffInfo.text}
                </p>
              </div>
            </div>
          )}

          {/* Blocked node with no provider answered */}
          {selectedNode.status_at_this_point === 'blocked' && selectedNode.reply === null && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
              <div className="p-1 rounded bg-rose-900/60 text-rose-300 shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-rose-200">No Provider Answered</p>
                <p className="text-[11px] text-rose-300/80 leading-relaxed mt-0.5">
                  All providers failed: {selectedNode.failed_providers.length > 0
                    ? selectedNode.failed_providers.join(', ')
                    : 'unknown'}
                  {selectedNode.failed_providers.length > 0 && ` (${selectedNode.failed_providers.length} tried)`}
                </p>
              </div>
            </div>
          )}

          {/* Lineage & Graph Connections */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-[#8b8ca1] uppercase tracking-wider">
              Lineage & Relationships
            </h4>

            {/* Parent Node */}
            <div className="p-2.5 rounded-lg bg-[#18181e] border border-[#262632] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-[#9a9ab0]">Parent Node (prev_id):</span>
              </div>
              {parentNode ? (
                <button
                  id={`jump-to-parent-${parentNode.node_id}`}
                  onClick={() => onSelectNode(parentNode.node_id)}
                  className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 hover:bg-indigo-900/90 border border-indigo-700/40 transition-colors"
                >
                  #{parentNode.node_id}
                </button>
              ) : (
                <span className="text-xs font-mono text-[#666778] italic">null (Root)</span>
              )}
            </div>

            {/* Children / Branches */}
            <div className="p-2.5 rounded-lg bg-[#18181e] border border-[#262632] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs text-[#9a9ab0]">Next in Chain:</span>
                </div>
                <span className="text-[10px] font-mono text-[#77788b]">
                  {childNodes.length} {childNodes.length === 1 ? 'child' : 'branches'}
                </span>
              </div>

              {childNodes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {childNodes.map((child) => (
                    <button
                      key={child.node_id}
                      id={`jump-to-child-${child.node_id}`}
                      onClick={() => onSelectNode(child.node_id)}
                      className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-[#22222c] hover:bg-[#2c2c3a] text-[#c7c8d9] border border-[#333342] transition-colors"
                    >
                      <CornerDownRight className="w-3 h-3 text-[#797a8e]" />
                      <span>#{child.node_id}</span>
                      <span className="text-[9px] text-[#717285] uppercase">
                        ({child.model_used})
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#636475] italic pt-0.5">
                  Leaf node (end of this path)
                </p>
              )}
            </div>

            {/* Decision References */}
            {selectedNode.type === 'decision' && (
              <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Link2 className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-medium">Referenced Memory Nodes:</span>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300">
                    {selectedNode.references?.length || 0}
                  </span>
                </div>

                {referencedNodes.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {referencedNodes.map((refNode) => (
                      <button
                        key={refNode.node_id}
                        id={`jump-to-ref-${refNode.node_id}`}
                        onClick={() => onSelectNode(refNode.node_id)}
                        className="w-full text-left p-2 rounded bg-[#1e152a] hover:bg-[#281b39] border border-purple-800/30 text-xs transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-mono font-semibold text-purple-300 text-[11px] group-hover:text-purple-200">
                            #{refNode.node_id}
                          </span>
                          <span className="text-[9px] uppercase font-mono text-purple-400/80">
                            {refNode.type} • {refNode.model_used}
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-200/70 line-clamp-1 leading-snug">
                          {refNode.content}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-purple-400/60 italic">No node references</p>
                )}
              </div>
            )}
          </div>

          {/* Full Content Payload - Prompt & Reply separately */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-[#8b8ca1] uppercase tracking-wider">
              Prompt (User Message)
            </h4>
            <div className="p-3.5 rounded-xl bg-[#121215] border border-[#252530] font-sans text-xs text-[#d7d8e6] leading-relaxed select-text whitespace-pre-wrap">
              {selectedNode.content}
            </div>

            <h4 className="text-[11px] font-semibold text-[#8b8ca1] uppercase tracking-wider">
              Model Reply
            </h4>
            <div className="p-3.5 rounded-xl bg-[#121215] border border-[#252530] font-sans text-xs text-[#d7d8e6] leading-relaxed select-text whitespace-pre-wrap">
              {selectedNode.reply !== null ? (
                selectedNode.reply
              ) : (
                <span className="text-rose-300/80 italic">
                  No provider answered for this turn.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
