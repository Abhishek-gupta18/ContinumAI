import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  BackgroundVariant,
  ReactFlowInstance,
  Panel,
  MarkerType,
} from '@xyflow/react';
import { MemoryNode, Session } from '../types';
import { TurnNode } from './nodes/TurnNode';
import { DecisionNode } from './nodes/DecisionNode';
import { CheckpointNode } from './nodes/CheckpointNode';
import { getLayoutedElements, SpacingDensity } from '../utils/graphLayout';
import { ColonyCanvasView } from './ColonyCanvasView';
import {
  GitFork,
  BookmarkCheck,
  MessageSquare,
  Sparkles,
  Cpu,
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
  Maximize,
  ArrowRight,
  ArrowDown,
  Info,
  Network,
  Share2,
  UnfoldHorizontal,
} from 'lucide-react';

interface GraphViewProps {
  session: Session;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  centerNodeTrigger?: string | null;
}

const nodeTypes = {
  turn: TurnNode,
  decision: DecisionNode,
  checkpoint: CheckpointNode,
};

export const GraphView: React.FC<GraphViewProps> = ({
  session,
  selectedNodeId,
  onSelectNode,
  centerNodeTrigger,
}) => {
  // View mode: 'colony' (Living Colony D3 physics) or 'tree' (ReactFlow static timeline/tree)
  const [viewMode, setViewMode] = useState<'colony' | 'tree'>('colony');

  // React Flow state for 'tree' mode
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [spacing, setSpacing] = useState<SpacingDensity>('comfortable');
  const [showReferences, setShowReferences] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Compute tree graph layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = getLayoutedElements(session.nodes, selectedNodeId, {
      direction,
      showReferences,
      spacing,
    });
    return { initialNodes: nodes, initialEdges: edges };
  }, [session.nodes, selectedNodeId, direction, showReferences, spacing]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when session, selection, or options change
  useEffect(() => {
    if (viewMode !== 'tree') return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      session.nodes,
      selectedNodeId,
      { direction, showReferences, spacing }
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: 0.28, duration: 400 });
    }, 50);
  }, [session.id, session.nodes, direction, showReferences, spacing, setNodes, setEdges, viewMode]);

  // Synchronize selection state in nodes/edges
  useEffect(() => {
    if (viewMode !== 'tree') return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
        data: {
          ...n.data,
          isSelected: n.id === selectedNodeId,
          direction,
        },
      }))
    );

    setEdges((eds) =>
      eds.map((e) => {
        const isPrevChain = e.id.startsWith('prev-');
        const isRef = e.id.startsWith('ref-');
        const isConnectedToSelected =
          selectedNodeId === e.source || selectedNodeId === e.target;

        if (isPrevChain) {
          return {
            ...e,
            style: {
              ...e.style,
              stroke: isConnectedToSelected ? '#818cf8' : '#4f5263',
              strokeWidth: isConnectedToSelected ? 2.5 : 1.75,
            },
            markerEnd: {
              ...(typeof e.markerEnd === 'object' ? e.markerEnd : {}),
              type: typeof e.markerEnd === 'object' && e.markerEnd?.type
                ? e.markerEnd.type
                : MarkerType.ArrowClosed,
              color: isConnectedToSelected ? '#818cf8' : '#4f5263',
            },
            zIndex: isConnectedToSelected ? 10 : 1,
          };
        } else if (isRef) {
          return {
            ...e,
            style: {
              ...e.style,
              stroke: isConnectedToSelected ? '#c084fc' : '#7c3aed',
              strokeWidth: isConnectedToSelected ? 2 : 1.5,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              ...(typeof e.markerEnd === 'object' ? e.markerEnd : {}),
              type: typeof e.markerEnd === 'object' && e.markerEnd?.type
                ? e.markerEnd.type
                : MarkerType.ArrowClosed,
              color: isConnectedToSelected ? '#c084fc' : '#7c3aed',
            },
            zIndex: isConnectedToSelected ? 12 : 2,
          };
        }
        return e;
      })
    );
  }, [selectedNodeId, direction, setNodes, setEdges, viewMode]);

  // Center on node in tree view if requested
  useEffect(() => {
    if (viewMode === 'tree' && centerNodeTrigger && rfInstanceRef.current) {
      const node = nodes.find((n) => centerNodeTrigger.startsWith(`${n.id}-`));
      if (node) {
        rfInstanceRef.current.setCenter(node.position.x + 130, node.position.y + 60, {
          zoom: 1.1,
          duration: 600,
        });
      }
    }
  }, [centerNodeTrigger, nodes, viewMode]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  // If Living Colony view is active, render the D3 Canvas simulation with mode switcher bar
  if (viewMode === 'colony') {
    return (
      <div className="relative w-full h-full flex flex-col">
        {/* Mode Switcher Pill (Floating Top Center) */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center bg-[#17171d]/90 backdrop-blur-md rounded-xl p-1 border border-[#2d2d3c] shadow-xl">
          <button
            id="view-mode-colony-btn"
            onClick={() => setViewMode('colony')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all bg-indigo-600 text-white shadow-xs"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Living Colony</span>
          </button>
          <button
            id="view-mode-tree-btn"
            onClick={() => setViewMode('tree')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all text-[#8e8fa5] hover:text-[#e1e2ec]"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Tree Flow</span>
          </button>
        </div>

        <ColonyCanvasView
          session={session}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          centerNodeTrigger={centerNodeTrigger}
        />
      </div>
    );
  }

  // Tree / Timeline Flow view
  const turnsCount = session.nodes.filter((n) => n.type === 'turn').length;
  const decisionsCount = session.nodes.filter((n) => n.type === 'decision').length;
  const checkpointsCount = session.nodes.filter((n) => n.type === 'checkpoint').length;
  const forksCount = session.nodes.filter((n) => {
    const children = session.nodes.filter((c) => c.prev_id === n.node_id);
    return children.length > 1;
  }).length;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#101013] overflow-hidden">
      {/* Top Obsidian-style Toolbar */}
      <div className="h-14 px-4 bg-[#141417] border-b border-[#24242c] flex items-center justify-between z-10 shrink-0 select-none">
        {/* Title & Quick Stats */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-[#efeff6] truncate tracking-tight">
              {session.title}
            </h2>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-[#20202a] text-[#8e8fa6] border border-[#2b2b38]">
              {session.nodes.length} nodes
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#282834] text-[11px] text-[#7c7d91]">
            <span className="flex items-center gap-1 text-pink-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" />
              {checkpointsCount} checkpoints
            </span>
            <span className="flex items-center gap-1 text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              {decisionsCount} decisions
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              {turnsCount} turns
            </span>
            {forksCount > 0 && (
              <span className="flex items-center gap-1 text-amber-300 font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-950/40 border border-amber-800/40">
                <GitFork className="w-2.5 h-2.5" /> {forksCount} {forksCount === 1 ? 'branch' : 'branches'}
              </span>
            )}
          </div>
        </div>

        {/* Controls and Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#1c1c22] rounded-lg p-0.5 border border-[#282834]">
            <button
              onClick={() => setViewMode('colony')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#848599] hover:text-[#c4c5d6] transition-colors"
            >
              <Network className="w-3 h-3 text-indigo-400" />
              <span>Colony</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#292936] text-[#f1f1f5] shadow-xs transition-colors"
            >
              <Share2 className="w-3 h-3 text-white" />
              <span>Tree</span>
            </button>
          </div>

          {/* Layout Direction Toggle */}
          <div className="flex items-center bg-[#1c1c22] rounded-lg p-0.5 border border-[#282834]">
            <button
              id="layout-horizontal-btn"
              onClick={() => setDirection('LR')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                direction === 'LR'
                  ? 'bg-[#292936] text-[#f1f1f5] shadow-xs'
                  : 'text-[#848599] hover:text-[#c4c5d6]'
              }`}
              title="Horizontal Timeline Flow"
            >
              <ArrowRight className="w-3 h-3" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              id="layout-vertical-btn"
              onClick={() => setDirection('TB')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                direction === 'TB'
                  ? 'bg-[#292936] text-[#f1f1f5] shadow-xs'
                  : 'text-[#848599] hover:text-[#c4c5d6]'
              }`}
              title="Vertical Tree Flow"
            >
              <ArrowDown className="w-3 h-3" />
              <span className="hidden sm:inline">Tree</span>
            </button>
          </div>

          {/* Node Spacing / Density Control */}
          <div className="hidden sm:flex items-center bg-[#1c1c22] rounded-lg p-0.5 border border-[#282834]">
            <span className="px-1.5 text-[10px] text-[#6b6c80] font-medium flex items-center gap-1">
              <UnfoldHorizontal className="w-3 h-3 text-[#8b8ca3]" />
              <span className="hidden xl:inline">Spacing:</span>
            </span>
            <button
              id="spacing-compact-btn"
              onClick={() => setSpacing('compact')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                spacing === 'compact'
                  ? 'bg-[#292936] text-[#f1f1f5] shadow-xs'
                  : 'text-[#848599] hover:text-[#c4c5d6]'
              }`}
              title="Compact spacing between nodes"
            >
              Compact
            </button>
            <button
              id="spacing-comfortable-btn"
              onClick={() => setSpacing('comfortable')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                spacing === 'comfortable'
                  ? 'bg-[#292936] text-[#f1f1f5] shadow-xs'
                  : 'text-[#848599] hover:text-[#c4c5d6]'
              }`}
              title="Comfortable / balanced spacing between nodes"
            >
              Normal
            </button>
            <button
              id="spacing-spacious-btn"
              onClick={() => setSpacing('spacious')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                spacing === 'spacious'
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-xs'
                  : 'text-[#848599] hover:text-[#c4c5d6]'
              }`}
              title="Extra spacious / airy separation between nodes"
            >
              Spacious
            </button>
          </div>

          {/* References Toggle */}
          <button
            id="toggle-references-btn"
            onClick={() => setShowReferences(!showReferences)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showReferences
                ? 'bg-purple-950/50 text-purple-300 border-purple-800/50'
                : 'bg-[#1c1c22] text-[#7b7c90] border-[#282834] hover:text-[#b4b5c7]'
            }`}
            title="Toggle Decision Reference Lines"
          >
            {showReferences ? <Eye className="w-3 h-3 text-purple-400" /> : <EyeOff className="w-3 h-3" />}
            <span className="hidden lg:inline">Ref Links</span>
          </button>

          {/* Fit View */}
          <button
            id="fit-view-toolbar-btn"
            onClick={() => rfInstanceRef.current?.fitView({ padding: 0.25, duration: 400 })}
            className="p-1.5 rounded-lg bg-[#1c1c22] hover:bg-[#252530] text-[#7b7c90] hover:text-[#e4e5f0] border border-[#282834] transition-colors"
            title="Fit Entire Graph to View"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>

          {/* Legend Toggle */}
          <button
            id="toggle-legend-btn"
            onClick={() => setShowLegend(!showLegend)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showLegend
                ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60'
                : 'bg-[#1c1c22] text-[#7b7c90] hover:text-[#e4e5f0] border-[#282834]'
            }`}
            title="Toggle Legend"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main React Flow Graph Area */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onInit={(inst) => {
            rfInstanceRef.current = inst;
            setTimeout(() => inst.fitView({ padding: 0.25 }), 100);
          }}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          className="bg-[#101013]"
        >
          <Background
            color="#22222b"
            gap={20}
            size={1.2}
            variant={BackgroundVariant.Dots}
          />
          <Controls
            position="bottom-left"
            showInteractive={false}
            className="!bg-[#17171d]/90 !border-[#2c2d3a] !rounded-xl !overflow-hidden !shadow-xl [&>button]:!bg-[#17171d] [&>button]:!border-b-[#2c2d3a] [&>button]:!text-[#a2a3b8] [&>button:hover]:!bg-[#22222c] [&>button:hover]:!text-[#f0f1f8]"
          />
          <MiniMap
            position="bottom-right"
            zoomable
            pannable
            nodeColor={(n) => {
              if (n.type === 'checkpoint') return '#ec4899';
              if (n.type === 'decision') return '#8b5cf6';
              return '#10b981';
            }}
            maskColor="rgba(16, 16, 19, 0.75)"
            className="!bg-[#141418]/90 !border-[#2a2a38] !rounded-xl !overflow-hidden !shadow-2xl hidden md:block"
          />
        </ReactFlow>

        {/* Legend Overlay */}
        {showLegend && (
          <div
            id="graph-legend-modal"
            className="absolute top-4 right-4 w-72 bg-[#16161c]/95 backdrop-blur-md border border-[#2b2b38] rounded-xl p-3.5 shadow-2xl z-20 space-y-3 text-xs text-[#c6c7d7]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#282834]">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f1f1f5]">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Memory Graph Legend</span>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="text-[#78798d] hover:text-[#f0f1f8]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#1e1f28] text-[#8e8fa6] border border-[#2d2e3d]">
                  <MessageSquare className="w-3 h-3" />
                </span>
                <div>
                  <div className="font-medium text-[#f1f1f5]">Turn Node</div>
                  <div className="text-[10px] text-[#7c7d91]">
                    Standard dialogue or autonomous task execution step
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60">
                  <GitFork className="w-3 h-3" />
                </span>
                <div>
                  <div className="font-medium text-purple-300">Decision Node</div>
                  <div className="text-[10px] text-[#7c7d91]">
                    Strategy fork, retry, or gateway model handoff trigger
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-pink-950/80 text-pink-300 border border-pink-700/60">
                  <BookmarkCheck className="w-3 h-3" />
                </span>
                <div>
                  <div className="font-medium text-pink-300">Checkpoint Node</div>
                  <div className="text-[10px] text-[#7c7d91]">
                    Compressed summary consolidating previous memory turns
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
