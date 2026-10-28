import React, { useState } from 'react';
import { MemoryNode } from '../types';
import { ModelBadge, StatusBadge } from './nodes/Badges';
import {
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Maximize2,
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
    const text = selectedNode.reply
      ? `User: ${selectedNode.content}\n\nAssistant (${selectedNode.model_used}):\n${selectedNode.reply}`
      : selectedNode.content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (collapsed) {
    return (
      <aside
        id="obsidian-detail-sidebar-collapsed"
        className="h-full w-12 bg-[#14122B] border-l border-[#2A2455] flex flex-col items-center py-3 shrink-0"
      >
        <button
          id="expand-detail-btn"
          onClick={onToggleCollapse}
          className="p-2 rounded-full bg-[#2A2455] text-[#9C98B8] hover:text-[#EEEAF7] transition-colors"
          title="Open node inspector"
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

  // Find direct child nodes
  const childNodes = selectedNode
    ? allNodes.filter((n) => n.prev_id === selectedNode.node_id)
    : [];

  // Find referenced nodes for decisions
  const referencedNodes = selectedNode?.references
    ? allNodes.filter((n) => selectedNode.references?.includes(n.node_id))
    : [];

  // Detect model handoff
  const isHandoff =
    parentNode && parentNode.model_used !== selectedNode?.model_used;

  const isBlocked = selectedNode?.status_at_this_point === 'blocked';
  const hasFailover = Boolean(selectedNode?.failed_providers && selectedNode.failed_providers.length > 0);

  return (
    <aside
      id="obsidian-detail-sidebar"
      className="h-full w-80 lg:w-96 bg-[#14122B] border-l border-[#2A2455] flex flex-col shrink-0 overflow-hidden text-left"
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#2A2455] shrink-0 bg-[#14122B]">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-xs text-[#EEEAF7]">
            Node inspector
          </span>
          {selectedNode && (
            <span className="font-mono-code text-xs px-2 py-0.5 rounded-full bg-[#2A2455] text-[#BFD4FF]">
              #{selectedNode.node_id}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {selectedNode && onCenterNode && (
            <button
              id="center-selected-node-btn"
              onClick={() => onCenterNode(selectedNode.node_id)}
              className="p-1.5 rounded-full text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
              title="Focus in graph"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id="collapse-detail-btn"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-full text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
            title="Collapse panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!selectedNode ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9C98B8]">
          <h4 className="text-sm font-medium text-[#EEEAF7] mb-1">No node selected</h4>
          <p className="text-xs max-w-[32ch]">
            Select any turn, checkpoint, or decision in the memory graph to inspect its context.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Metadata Grid */}
          <div className="p-3.5 rounded-lg bg-[#14122B] border border-[#2A2455] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9C98B8]">Model engine</span>
              <ModelBadge model={selectedNode.model_used} size="sm" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9C98B8]">Execution status</span>
              <StatusBadge status={selectedNode.status_at_this_point} size="sm" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9C98B8]">Node category</span>
              <span className="font-mono-code text-[#EEEAF7]">
                {selectedNode.type}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2A2455]">
              <span className="text-[#9C98B8]">Recorded at</span>
              <span className="font-mono-code text-[11px] text-[#EEEAF7]">
                {new Date(selectedNode.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Blocked Alert */}
          {isBlocked && (
            <div className="p-3 rounded-lg bg-[#2A2455] border border-rose-500/50 text-xs text-rose-200">
              <p className="font-medium text-rose-200">Execution blocked</p>
              <p className="text-xs text-rose-300/80 mt-1">
                This turn encountered a policy or model halt at this step.
              </p>
            </div>
          )}

          {/* Failover Alert */}
          {hasFailover && (
            <div className="p-3 rounded-lg bg-[#2A2455] border border-[#F0A35E]/50 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#F0A35E] glow-gpt" />
                <span className="font-medium text-[#F0A35E]">Failover triggered</span>
              </div>
              <p className="text-xs text-[#EEEAF7]/85 leading-relaxed">
                Primary provider {selectedNode.failed_providers?.join(', ')} returned rate limits. Routed to {selectedNode.model_used} without memory loss.
              </p>
            </div>
          )}

          {/* Checkpoint Milestone */}
          {selectedNode.type === 'checkpoint' && (
            <div className="p-3 rounded-lg bg-[#2A2455] border border-[#BFD4FF]/40 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-[#BFD4FF] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
                <span>Colony checkpoint milestone</span>
              </div>
              <p className="text-xs text-[#9C98B8] leading-relaxed">
                Immutable memory snapshot. Prior turn chain is consolidated and pinned to persistent storage.
              </p>
            </div>
          )}

          {/* Model Handoff Alert */}
          {isHandoff && parentNode && (
            <div className="p-3 rounded-lg bg-[#2A2455] border border-[#BFD4FF]/40 text-xs">
              <p className="font-medium text-[#EEEAF7]">Model handoff</p>
              <p className="text-xs text-[#9C98B8] mt-1">
                Handed off from {parentNode.model_used} to {selectedNode.model_used} while preserving memory state.
              </p>
            </div>
          )}

          {/* Lineage & Graph Connections */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[#9C98B8]">
              Lineage
            </h4>

            {/* Parent Node */}
            <div className="p-2.5 rounded-lg bg-[#14122B] border border-[#2A2455] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#9C98B8]">
                <ArrowLeft className="w-3.5 h-3.5 text-[#BFD4FF]" />
                <span>Parent node:</span>
              </div>
              {parentNode ? (
                <button
                  id={`jump-to-parent-${parentNode.node_id}`}
                  onClick={() => onSelectNode(parentNode.node_id)}
                  className="font-mono-code text-xs px-2.5 py-0.5 rounded-full bg-[#2A2455] text-[#BFD4FF] hover:bg-[#342d6a] transition-colors"
                >
                  #{parentNode.node_id}
                </button>
              ) : (
                <span className="text-xs font-mono-code text-[#9C98B8] italic">Root node</span>
              )}
            </div>

            {/* Children / Branches */}
            <div className="p-2.5 rounded-lg bg-[#14122B] border border-[#2A2455] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#9C98B8]">
                  <ArrowRight className="w-3.5 h-3.5 text-[#BFD4FF]" />
                  <span>Next in chain:</span>
                </div>
                <span className="font-mono-code text-xs text-[#9C98B8]">
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
                      className="inline-flex items-center gap-1 font-mono-code text-xs px-2.5 py-1 rounded-full bg-[#2A2455] hover:bg-[#342d6a] text-[#EEEAF7] transition-colors"
                    >
                      <span>#{child.node_id}</span>
                      <span className="text-[10px] text-[#9C98B8]">
                        ({child.model_used})
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9C98B8] italic">
                  Leaf node (end of chain)
                </p>
              )}
            </div>

            {/* Decision References */}
            {selectedNode.type === 'decision' && (
              <div className="p-2.5 rounded-lg bg-[#14122B] border border-[#2A2455] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#EEEAF7]">
                  <span>Referenced memory nodes:</span>
                  <span className="font-mono-code text-xs text-[#E58AB0]">
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
                        className="w-full text-left p-2 rounded-md bg-[#2A2455]/50 hover:bg-[#2A2455] border border-[#2A2455] text-xs transition-colors"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-mono-code text-xs text-[#BFD4FF]">
                            #{refNode.node_id}
                          </span>
                          <span className="text-[10px] text-[#9C98B8]">
                            {refNode.model_used}
                          </span>
                        </div>
                        <p className="text-xs text-[#9C98B8] line-clamp-1">
                          {refNode.content}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9C98B8] italic">No node references</p>
                )}
              </div>
            )}
          </div>

          {/* User Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-[#9C98B8]">
                User instruction
              </h4>
              <button
                id="copy-node-content-btn"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-[#2A2455] hover:bg-[#342d6a] text-[#EEEAF7] transition-colors"
                title="Copy content"
              >
                {copied ? <Check className="w-3 h-3 text-[#BFD4FF]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#14122B] border border-[#2A2455] font-body text-xs text-[#EEEAF7] leading-relaxed select-text whitespace-pre-wrap">
              {selectedNode.content}
            </div>
          </div>

          {/* Assistant Reply Payload */}
          {selectedNode.reply && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-[#9C98B8]">
                  Assistant reply ({selectedNode.model_used})
                </h4>
              </div>
              <div className="p-3.5 rounded-lg bg-[#14122B] border border-[#2A2455] font-body text-xs text-[#EEEAF7] leading-relaxed select-text whitespace-pre-wrap">
                {selectedNode.reply}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
