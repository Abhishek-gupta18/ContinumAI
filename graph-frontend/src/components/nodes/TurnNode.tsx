import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNode } from '../../types';
import { ModelBadge, StatusBadge } from './Badges';

interface TurnNodeData {
  node: MemoryNode;
  isSelected: boolean;
  direction: 'LR' | 'TB';
}

export const TurnNode: React.FC<{ data: TurnNodeData }> = memo(({ data }) => {
  const { node, isSelected, direction } = data;
  const isLR = direction === 'LR';
  const hasFailover = Boolean(node.failed_providers && node.failed_providers.length > 0);
  const isBlocked = node.status_at_this_point === 'blocked';

  return (
    <div
      id={`node-${node.node_id}`}
      className={`group relative rounded-lg transition-colors cursor-pointer select-none border p-3 w-[260px] bg-[#14122B] ${
        isBlocked
          ? 'border-rose-500 text-rose-200'
          : isSelected
          ? 'border-[#BFD4FF] ring-1 ring-[#BFD4FF]/50'
          : 'border-[#2A2455] hover:border-[#38326e]'
      }`}
    >
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className="!w-2 !h-2 !bg-[#BFD4FF] !border-2 !border-[#14122B]"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono-code text-[11px] font-medium text-[#9C98B8]">
            #{node.node_id}
          </span>
          <span className="text-[11px] text-[#9C98B8] font-body">turn</span>
        </div>
        <ModelBadge model={node.model_used} size="sm" />
      </div>

      {/* Failover note if present */}
      {hasFailover && (
        <div className="mb-2 px-2 py-0.5 rounded-full bg-[#2A2455] text-[10px] text-[#F0A35E] font-body">
          Failover from {node.failed_providers?.join(', ')}
        </div>
      )}

      {/* Content Preview */}
      <p className="text-xs text-[#EEEAF7] leading-relaxed line-clamp-2 mb-2 font-body">
        {node.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2A2455] text-[10px] text-[#9C98B8]">
        <StatusBadge status={node.status_at_this_point} size="sm" />
        <span className="font-mono-code">
          {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        className="!w-2 !h-2 !bg-[#BFD4FF] !border-2 !border-[#14122B]"
      />
    </div>
  );
});

TurnNode.displayName = 'TurnNode';
