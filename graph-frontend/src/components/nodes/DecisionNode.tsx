import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNode } from '../../types';
import { ModelBadge, StatusBadge } from './Badges';
import { GitFork, Link2 } from 'lucide-react';

interface DecisionNodeData {
  node: MemoryNode;
  isSelected: boolean;
  direction: 'LR' | 'TB';
}

export const DecisionNode: React.FC<{ data: DecisionNodeData }> = memo(({ data }) => {
  const { node, isSelected, direction } = data;
  const isLR = direction === 'LR';
  const refCount = node.references?.length || 0;

  return (
    <div
      id={`node-${node.node_id}`}
      className={`group relative rounded-xl transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-[#22182d] border-purple-500 shadow-xl shadow-purple-900/30 ring-2 ring-purple-500/50 -translate-y-0.5'
          : 'bg-[#1b1424] hover:bg-[#20182b] border-purple-700/50 hover:border-purple-500/70 shadow-md shadow-purple-950/20'
      } border p-3.5 w-[290px]`}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#1b1424] transition-transform group-hover:scale-125"
      />

      {/* Header with Decision Banner & Node ID */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
            <GitFork className="w-3 h-3" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
            Decision
          </span>
          <span className="font-mono text-[11px] font-semibold text-purple-300/80">
            #{node.node_id}
          </span>
        </div>
        <ModelBadge model={node.model_used} provider={node.provider} failed_providers={node.failed_providers} size="sm" />
      </div>

      {/* Content Preview */}
      <p className="text-[12px] text-purple-100/90 leading-snug line-clamp-2 mb-2.5 font-normal">
        {node.content}
      </p>

      {/* References Pill if references exist */}
      {refCount > 0 && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-md bg-purple-950/70 border border-purple-800/40 text-[10px] text-purple-300">
          <Link2 className="w-2.5 h-2.5 shrink-0 text-purple-400" />
          <span className="font-medium">References:</span>
          <span className="font-mono text-purple-200 truncate">
            {node.references?.map((r) => `#${r}`).join(', ')}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-purple-900/40 text-[10px] text-purple-300/70">
        <StatusBadge status={node.status_at_this_point} size="sm" />
        <span className="font-mono">
          {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#1b1424] transition-transform group-hover:scale-125"
      />
    </div>
  );
});

DecisionNode.displayName = 'DecisionNode';
