import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNode } from '../../types';
import { ModelBadge, StatusBadge } from './Badges';
import { BookmarkCheck, Layers } from 'lucide-react';

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
      className={`group relative rounded-xl transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-[#11232c] border-cyan-400 shadow-xl shadow-cyan-900/30 ring-2 ring-cyan-400/50 -translate-y-0.5'
          : 'bg-[#0d1a21] hover:bg-[#102029] border-cyan-700/60 hover:border-cyan-500/80 shadow-md shadow-cyan-950/30'
      } border p-4 w-[320px]`}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-[#0d1a21] transition-transform group-hover:scale-125"
      />

      {/* Top Banner */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-cyan-900/50">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-600/40">
            <BookmarkCheck className="w-3.5 h-3.5" />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Checkpoint
              </span>
              <span className="font-mono text-[10px] font-semibold text-cyan-400/80">
                #{node.node_id}
              </span>
            </div>
            <span className="text-[9px] text-cyan-300/70 font-mono tracking-tight flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> Compressed Memory Snapshot
            </span>
          </div>
        </div>
        <ModelBadge model={node.model_used} size="sm" />
      </div>

      {/* Content Preview */}
      <p className="text-[12px] text-cyan-100/90 leading-snug line-clamp-3 mb-2.5 font-normal">
        {node.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-cyan-900/40 text-[10px] text-cyan-300/70">
        <StatusBadge status={node.status_at_this_point} size="sm" />
        <span className="font-mono">
          {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-[#0d1a21] transition-transform group-hover:scale-125"
      />
    </div>
  );
});

CheckpointNode.displayName = 'CheckpointNode';
