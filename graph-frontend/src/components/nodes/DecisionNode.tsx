import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNode } from '../../types';
import { ModelBadge, StatusBadge } from './Badges';

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
      className={`group relative rounded-lg transition-colors cursor-pointer select-none border p-3 w-[270px] bg-[#14122B] ${
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

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E58AB0] glow-claude" />
          <span className="text-xs font-medium text-[#EEEAF7] font-body">
            Decision
          </span>
          <span className="font-mono-code text-[11px] text-[#9C98B8]">
            #{node.node_id}
          </span>
        </div>
        <ModelBadge model={node.model_used} size="sm" />
      </div>

      {/* Content Preview */}
      <p className="text-xs text-[#EEEAF7] leading-relaxed line-clamp-2 mb-2 font-body">
        {node.content}
      </p>

      {/* References */}
      {refCount > 0 && (
        <div className="flex items-center gap-1 mb-2 px-2 py-0.5 rounded-full bg-[#2A2455] text-[10px] text-[#9C98B8]">
          <span>References:</span>
          <span className="font-mono-code text-[#EEEAF7] truncate">
            {node.references?.map((r) => `#${r}`).join(', ')}
          </span>
        </div>
      )}

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

DecisionNode.displayName = 'DecisionNode';
