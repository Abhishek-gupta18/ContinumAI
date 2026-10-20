import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNode } from '../../types';
import { ModelBadge, StatusBadge } from './Badges';
import { MessageSquare } from 'lucide-react';

interface TurnNodeData {
  node: MemoryNode;
  isSelected: boolean;
  direction: 'LR' | 'TB';
}

export const TurnNode: React.FC<{ data: TurnNodeData }> = memo(({ data }) => {
  const { node, isSelected, direction } = data;
  const isLR = direction === 'LR';

  return (
    <div
      id={`node-${node.node_id}`}
      className={`group relative rounded-xl transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-[#1e1e26] border-indigo-500/90 shadow-lg shadow-indigo-500/15 ring-2 ring-indigo-500/40 -translate-y-0.5'
          : 'bg-[#17171c] hover:bg-[#1c1c22] border-[#2a2a34] hover:border-[#3e3e4e]'
      } border p-3 w-[260px]`}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className="!w-2 !h-2 !bg-[#6366f1] !border-2 !border-[#17171c] transition-transform group-hover:scale-125"
      />

      {/* Header with Type, Node ID & Model */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-[#24242e] text-[#9a9ab0]">
            <MessageSquare className="w-3 h-3" />
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#8e8fa6] tracking-tight">
            #{node.node_id}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ModelBadge model={node.model_used} provider={node.provider} failed_providers={node.failed_providers} size="sm" />
        </div>
      </div>

      {/* Content Preview */}
      <p className="text-[12px] text-[#c9cad6] leading-snug line-clamp-2 mb-2 font-normal">
        {node.content}
      </p>

      {/* Footer info: status & timestamp */}
      <div className="flex items-center justify-between pt-1 border-t border-[#23232c] text-[10px] text-[#717284]">
        <StatusBadge status={node.status_at_this_point} size="sm" />
        <span className="font-mono">
          {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        className="!w-2 !h-2 !bg-[#6366f1] !border-2 !border-[#17171c] transition-transform group-hover:scale-125"
      />
    </div>
  );
});

TurnNode.displayName = 'TurnNode';
