import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNode } from '../../types';
import { ModelBadge, StatusBadge } from './Badges';

interface CheckpointNodeData {
  node: MemoryNode;
  isSelected: boolean;
  direction: 'LR' | 'TB';
}

export const CheckpointNode: React.FC<{ data: CheckpointNodeData }> = memo(({ data }) => {
  const { node, isSelected, direction } = data;
  const isLR = direction === 'LR';

  return (
    <div
      id={`node-${node.node_id}`}
      className={`group relative rounded-lg transition-colors cursor-pointer select-none border p-3.5 w-[300px] bg-[#14122B] ${
        isSelected
          ? 'border-[#BFD4FF] ring-1 ring-[#BFD4FF]/50'
          : 'border-[#2A2455] hover:border-[#38326e]'
      }`}
    >
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className="!w-2 !h-2 !bg-[#BFD4FF] !border-2 !border-[#14122B]"
      />

      {/* Top Banner */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#2A2455]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
          <span className="text-xs font-medium text-[#EEEAF7] font-body">
            Checkpoint
          </span>
          <span className="font-mono-code text-[11px] text-[#9C98B8]">
            #{node.node_id}
          </span>
        </div>
        <ModelBadge model={node.model_used} size="sm" />
      </div>

      {/* Content Preview */}
      <p className="text-xs text-[#EEEAF7] leading-relaxed line-clamp-3 mb-2.5 font-body">
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

CheckpointNode.displayName = 'CheckpointNode';
