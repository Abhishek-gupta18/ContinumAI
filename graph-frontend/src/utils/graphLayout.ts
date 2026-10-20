import dagre from '@dagrejs/dagre';
import { Edge, MarkerType, Node } from '@xyflow/react';
import { MemoryNode } from '../types';

export type SpacingDensity = 'compact' | 'comfortable' | 'spacious';

export interface GraphLayoutOptions {
  direction?: 'TB' | 'LR'; // Top to Bottom or Left to Right
  showReferences?: boolean;
  spacing?: SpacingDensity;
  nodeSpacing?: number;
  rankSpacing?: number;
}

export const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  turn: { width: 260, height: 130 },
  decision: { width: 290, height: 165 },
  checkpoint: { width: 320, height: 180 },
};

export function getLayoutedElements(
  memoryNodes: MemoryNode[],
  selectedNodeId: string | null = null,
  options: GraphLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const direction = options.direction || 'LR';
  const showReferences = options.showReferences !== false;
  const spacing = options.spacing || 'comfortable';

  // Compute spacing based on density level
  // In LR mode:
  // - ranksep: horizontal distance between sequential steps
  // - nodesep: vertical distance between parallel branches/siblings
  // In TB mode:
  // - ranksep: vertical distance between sequential steps
  // - nodesep: horizontal distance between parallel branches/siblings
  let defaultNodeSep = 110;
  let defaultRankSep = 160;

  if (spacing === 'compact') {
    defaultNodeSep = direction === 'LR' ? 70 : 80;
    defaultRankSep = direction === 'LR' ? 110 : 110;
  } else if (spacing === 'spacious') {
    defaultNodeSep = direction === 'LR' ? 150 : 160;
    defaultRankSep = direction === 'LR' ? 220 : 200;
  } else {
    // 'comfortable' (new generous default)
    defaultNodeSep = direction === 'LR' ? 110 : 125;
    defaultRankSep = direction === 'LR' ? 165 : 155;
  }

  const nodesep = options.nodeSpacing ?? defaultNodeSep;
  const ranksep = options.rankSpacing ?? defaultRankSep;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
    marginx: 60,
    marginy: 60,
  });

  // Map of node_id to memoryNode
  const nodeMap = new Map<string, MemoryNode>();
  memoryNodes.forEach((node) => {
    nodeMap.set(node.node_id, node);
    const dims = NODE_DIMENSIONS[node.type] || { width: 260, height: 120 };
    dagreGraph.setNode(node.node_id, { width: dims.width, height: dims.height });
  });

  // Add primary prev_id edges to Dagre for hierarchical positioning
  memoryNodes.forEach((node) => {
    if (node.prev_id && nodeMap.has(node.prev_id)) {
      dagreGraph.setEdge(node.prev_id, node.node_id);
    }
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Build React Flow nodes
  const nodes: Node[] = memoryNodes.map((node) => {
    const dagreNode = dagreGraph.node(node.node_id);
    const dims = NODE_DIMENSIONS[node.type] || { width: 260, height: 120 };
    const isSelected = selectedNodeId === node.node_id;

    // Center coordinates from Dagre need to be converted to top-left for React Flow
    const x = dagreNode ? dagreNode.x - dims.width / 2 : 0;
    const y = dagreNode ? dagreNode.y - dims.height / 2 : 0;

    return {
      id: node.node_id,
      type: node.type,
      position: { x, y },
      data: {
        node,
        isSelected,
        direction,
      },
      selected: isSelected,
    };
  });

  // Build React Flow edges
  const edges: Edge[] = [];

  // 1. Main prev_id chain edges
  memoryNodes.forEach((node) => {
    if (node.prev_id && nodeMap.has(node.prev_id)) {
      const isConnectedToSelected =
        selectedNodeId === node.node_id || selectedNodeId === node.prev_id;

      edges.push({
        id: `prev-${node.prev_id}->${node.node_id}`,
        source: node.prev_id,
        target: node.node_id,
        type: 'smoothstep',
        animated: node.status_at_this_point === 'in_progress',
        style: {
          stroke: isConnectedToSelected ? '#818cf8' : '#4f5263',
          strokeWidth: isConnectedToSelected ? 2.5 : 1.75,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isConnectedToSelected ? '#818cf8' : '#4f5263',
        },
        zIndex: isConnectedToSelected ? 10 : 1,
      });
    }
  });

  // 2. Reference edges (only for decision nodes with references)
  if (showReferences) {
    memoryNodes.forEach((node) => {
      if (node.type === 'decision' && node.references && node.references.length > 0) {
        node.references.forEach((refId) => {
          if (nodeMap.has(refId)) {
            const isConnectedToSelected =
              selectedNodeId === node.node_id || selectedNodeId === refId;

            edges.push({
              id: `ref-${node.node_id}->${refId}`,
              source: node.node_id,
              target: refId,
              type: 'bezier',
              label: 'ref',
              labelStyle: {
                fill: isConnectedToSelected ? '#c084fc' : '#8b5cf6',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.05em',
              },
              labelBgStyle: {
                fill: '#18181b',
                fillOpacity: 0.85,
                stroke: '#3b0764',
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              labelBgPadding: [4, 2] as [number, number],
              style: {
                stroke: isConnectedToSelected ? '#c084fc' : '#7c3aed',
                strokeWidth: isConnectedToSelected ? 2 : 1.5,
                strokeDasharray: '5,5',
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 12,
                height: 12,
                color: isConnectedToSelected ? '#c084fc' : '#7c3aed',
              },
              zIndex: isConnectedToSelected ? 12 : 2,
            });
          }
        });
      }
    });
  }

  return { nodes, edges };
}
