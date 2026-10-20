import * as d3 from 'd3';
import { MemoryNode, MemoryNodeType, ModelUsed, NodeStatus } from '../types';

export interface ColonySimNode extends d3.SimulationNodeDatum {
  id: string;
  node: MemoryNode;
  clusterId: string; // The checkpoint ID this node clusters around
  type: MemoryNodeType;
  model: ModelUsed;
  provider: string | null;
  failed_providers: string[];
  status: NodeStatus;
  radius: number;
  color: string;
  glowColor: string;
  label: string;
  isCheckpoint: boolean;
  isDecision: boolean;
  depthFromCheckpoint: number;
  vx?: number;
  vy?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  basePhase?: number; // for organic breathing drift
}

export interface ColonySimLink extends d3.SimulationLinkDatum<ColonySimNode> {
  id: string;
  source: string | ColonySimNode;
  target: string | ColonySimNode;
  isReference: boolean;
  isCrossCluster: boolean;
  strength?: number;
  distance?: number;
}

// Provider label helper (same logic as in Badges.tsx)
export function providerLabel(model: ModelUsed, provider: string | null): { display: string; colorKey: 'openai' | 'gemini' | 'claude' | 'unknown' } {
  if (provider) {
    const p = provider.toLowerCase();
    if (p.includes('openai') || p.includes('gpt') || p.includes('o1') || p.includes('o3')) {
      return { display: 'OpenAI', colorKey: 'openai' };
    }
    if (p.includes('gemini')) {
      return { display: 'Gemini', colorKey: 'gemini' };
    }
    if (p.includes('claude') || p.includes('anthropic')) {
      return { display: 'Claude', colorKey: 'claude' };
    }
    return { display: provider, colorKey: 'unknown' };
  }
  const m = model.toLowerCase();
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3')) {
    return { display: 'OpenAI', colorKey: 'openai' };
  }
  if (m.includes('gemini')) {
    return { display: 'Gemini', colorKey: 'gemini' };
  }
  if (m.includes('claude')) {
    return { display: 'Claude', colorKey: 'claude' };
  }
  return { display: 'Unknown', colorKey: 'unknown' };
}

// Color Palette matched to Obsidian graph and user's reference images
export const COLONY_COLORS = {
  checkpoint: '#ec4899', // Radiant Magenta / Pink
  checkpointGlow: 'rgba(236, 72, 153, 0.45)',
  
  decision: '#8b5cf6', // Vivid Purple
  decisionGlow: 'rgba(139, 92, 246, 0.4)',

  openaiTurn: '#10b981', // Crisp Emerald / Mint
  openaiGlow: 'rgba(16, 185, 129, 0.35)',

  geminiTurn: '#06b6d4', // Cyan for Gemini
  geminiGlow: 'rgba(6, 182, 212, 0.35)',

  claudeTurn: '#f59e0b', // Warm Amber / Coral
  claudeGlow: 'rgba(245, 158, 11, 0.35)',

  unknownTurn: '#6b7280', // Neutral gray
  unknownGlow: 'rgba(107, 114, 128, 0.35)',

  blocked: '#f43f5e', // Rose
  inProgressGlow: 'rgba(56, 189, 248, 0.6)',
  
  linkPrev: 'rgba(148, 163, 184, 0.28)', // Neutral slate connection
  linkRef: 'rgba(168, 85, 247, 0.55)', // Dashed purple reference
  linkCrossCluster: 'rgba(161, 161, 170, 0.18)',
};

export function getNodeRadius(type: MemoryNodeType): number {
  switch (type) {
    case 'checkpoint':
      return 17; // Largest, hub / colony anchor
    case 'decision':
      return 10; // Medium, pivotal fork
    case 'turn':
    default:
      return 5.5; // Smallest, dense colony particles
  }
}

function getNodeColors(type: MemoryNodeType, model: ModelUsed, provider: string | null): { color: string; glow: string } {
  if (type === 'checkpoint') {
    return { color: COLONY_COLORS.checkpoint, glow: COLONY_COLORS.checkpointGlow };
  }
  if (type === 'decision') {
    return { color: COLONY_COLORS.decision, glow: COLONY_COLORS.decisionGlow };
  }
  const { colorKey } = providerLabel(model, provider);
  switch (colorKey) {
    case 'openai':
      return { color: COLONY_COLORS.openaiTurn, glow: COLONY_COLORS.openaiGlow };
    case 'gemini':
      return { color: COLONY_COLORS.geminiTurn, glow: COLONY_COLORS.geminiGlow };
    case 'claude':
      return { color: COLONY_COLORS.claudeTurn, glow: COLONY_COLORS.claudeGlow };
    default:
      return { color: COLONY_COLORS.unknownTurn, glow: COLONY_COLORS.unknownGlow };
  }
}

/**
 * Prepares nodes and links with cluster assignment.
 * Nodes between two checkpoints gravitate around their nearest preceding checkpoint or first checkpoint.
 */
export function buildColonyGraph(memoryNodes: MemoryNode[]): {
  simNodes: ColonySimNode[];
  simLinks: ColonySimLink[];
  clusterCenters: string[];
} {
  const nodeMap = new Map<string, MemoryNode>();
  memoryNodes.forEach((n) => nodeMap.set(n.node_id, n));

  // Identify all checkpoint nodes
  const checkpoints = memoryNodes.filter((n) => n.type === 'checkpoint');
  const clusterCenters = checkpoints.map((c) => c.node_id);

  // If there are no checkpoints, create a virtual cluster from the root node
  const defaultClusterId = checkpoints.length > 0 ? checkpoints[0].node_id : (memoryNodes[0]?.node_id || 'root');

  // Assign clusterId to each node based on the nearest checkpoint backward in the prev_id chain,
  // or forward if before the first checkpoint.
  const clusterMap = new Map<string, { clusterId: string; depth: number }>();

  // Helper to trace back to nearest checkpoint
  function findNearestCheckpoint(startNode: MemoryNode): { clusterId: string; depth: number } {
    let curr: MemoryNode | undefined = startNode;
    let depth = 0;
    const visited = new Set<string>();

    // If this node is itself a checkpoint, it is its own cluster
    if (curr.type === 'checkpoint') {
      return { clusterId: curr.node_id, depth: 0 };
    }

    // Trace forward if ahead of a checkpoint
    while (curr && !visited.has(curr.node_id)) {
      visited.add(curr.node_id);
      if (curr.type === 'checkpoint') {
        return { clusterId: curr.node_id, depth };
      }
      depth++;
      curr = curr.prev_id ? nodeMap.get(curr.prev_id) : undefined;
    }

    // If tracing back didn't find one, associate with the earliest forward checkpoint
    for (const cp of checkpoints) {
      return { clusterId: cp.node_id, depth: 3 };
    }

    return { clusterId: defaultClusterId, depth: 1 };
  }

  memoryNodes.forEach((node) => {
    clusterMap.set(node.node_id, findNearestCheckpoint(node));
  });

  // Build sim nodes
  const simNodes: ColonySimNode[] = memoryNodes.map((node, idx) => {
    const clusterInfo = clusterMap.get(node.node_id) || { clusterId: defaultClusterId, depth: 1 };
    const radius = getNodeRadius(node.type);
    const { color, glow } = getNodeColors(node.type, node.model_used, node.provider);

    // Initial position: arrange loosely around their cluster center
    const clusterIdx = clusterCenters.indexOf(clusterInfo.clusterId);
    const angle = (idx * 0.45) % (Math.PI * 2);
    const spread = node.type === 'checkpoint' ? 0 : 35 + (idx % 12) * 12;
    const clusterCenterX = (clusterIdx >= 0 ? (clusterIdx - (clusterCenters.length - 1) / 2) * 320 : 0);
    const clusterCenterY = (clusterIdx >= 0 ? (clusterIdx % 2 === 0 ? -40 : 40) : 0);

    return {
      id: node.node_id,
      node,
      clusterId: clusterInfo.clusterId,
      type: node.type,
      model: node.model_used,
      provider: node.provider,
      failed_providers: node.failed_providers,
      status: node.status_at_this_point,
      radius,
      color,
      glowColor: glow,
      label: node.type === 'checkpoint' 
        ? `Checkpoint #${node.node_id}`
        : node.type === 'decision' 
        ? `Decision #${node.node_id}`
        : `#${node.node_id}`,
      isCheckpoint: node.type === 'checkpoint',
      isDecision: node.type === 'decision',
      depthFromCheckpoint: clusterInfo.depth,
      basePhase: Math.random() * Math.PI * 2,
      x: clusterCenterX + Math.cos(angle) * spread,
      y: clusterCenterY + Math.sin(angle) * spread,
    };
  });

  // Build links
  const simLinks: ColonySimLink[] = [];

  // 1. Primary prev_id links
  memoryNodes.forEach((node) => {
    if (node.prev_id && nodeMap.has(node.prev_id)) {
      const sourceCluster = clusterMap.get(node.prev_id)?.clusterId;
      const targetCluster = clusterMap.get(node.node_id)?.clusterId;
      const isCrossCluster = sourceCluster !== targetCluster;

      simLinks.push({
        id: `prev-${node.prev_id}->${node.node_id}`,
        source: node.prev_id,
        target: node.node_id,
        isReference: false,
        isCrossCluster,
        // Intra-cluster links are tighter springs; cross-cluster links allow colonies to breathe apart
        distance: isCrossCluster ? 160 : 32,
        strength: isCrossCluster ? 0.35 : 0.85,
      });
    }
  });

  // 2. Reference links (decision nodes)
  memoryNodes.forEach((node) => {
    if (node.type === 'decision' && node.references) {
      node.references.forEach((refId) => {
        if (nodeMap.has(refId)) {
          simLinks.push({
            id: `ref-${node.node_id}->${refId}`,
            source: node.node_id,
            target: refId,
            isReference: true,
            isCrossCluster: true,
            distance: 90,
            strength: 0.15,
          });
        }
      });
    }
  });

  return { simNodes, simLinks, clusterCenters };
}
