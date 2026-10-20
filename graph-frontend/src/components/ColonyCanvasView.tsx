import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { MemoryNode, Session } from '../types';
import {
  ColonySimNode,
  ColonySimLink,
  buildColonyGraph,
  COLONY_COLORS,
  providerLabel,
} from '../utils/colonyPhysics';
import {
  Play,
  Pause,
  Maximize,
  Sparkles,
  Cpu,
  Layers,
  HelpCircle,
  Eye,
  Sliders,
  Filter,
  BookmarkCheck,
  GitFork,
  MessageSquare,
  Search,
} from 'lucide-react';

interface ColonyCanvasViewProps {
  session: Session;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  centerNodeTrigger?: string | null;
}

export const ColonyCanvasView: React.FC<ColonyCanvasViewProps> = ({
  session,
  selectedNodeId,
  onSelectNode,
  centerNodeTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation & Graph Data Refs
  const simRef = useRef<d3.Simulation<ColonySimNode, ColonySimLink> | null>(null);
  const nodesRef = useRef<ColonySimNode[]>([]);
  const linksRef = useRef<ColonySimLink[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Camera / Transform state: x, y, scale
  const transformRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // User Interaction State
  const hoveredNodeRef = useRef<ColonySimNode | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const draggedNodeRef = useRef<ColonySimNode | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef<boolean>(false);
  const panStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Physics & Visual Settings
  const [physicsDriftEnabled, setPhysicsDriftEnabled] = useState(true);
  const [driftSpeed, setDriftSpeed] = useState<number>(1.2); // Jitter multiplier
  const [colonyGravity, setColonyGravity] = useState<number>(0.07); // Pull towards checkpoint center
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  const [showReferences, setShowReferences] = useState<boolean>(true);
  const [modelFilter, setModelFilter] = useState<'all' | 'openai' | 'gemini' | 'claude'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'checkpoint' | 'decision' | 'turn'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Build simulation data whenever the session nodes change
  useEffect(() => {
    const { simNodes, simLinks } = buildColonyGraph(session.nodes);
    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // Destroy existing simulation if any
    if (simRef.current) {
      simRef.current.stop();
    }

    // Set up D3 Force Simulation
    const simulation = d3
      .forceSimulation<ColonySimNode>(simNodes)
      .alphaDecay(0.015) // Slow, gentle relaxation
      .alphaTarget(physicsDriftEnabled ? 0.035 : 0) // Never completely freezes if drift enabled!
      .velocityDecay(0.35); // Viscous fluid damping for organic colony movement

    // 1. Link Force (prev_id chain and references)
    const linkForce = d3
      .forceLink<ColonySimNode, ColonySimLink>(simLinks)
      .id((d) => d.id)
      .distance((link) => (link.isReference ? 95 : link.isCrossCluster ? 150 : 34))
      .strength((link) => (link.isReference ? 0.12 : link.isCrossCluster ? 0.35 : 0.85));

    // 2. Many-Body Charge Force (repel siblings and spread nodes)
    const chargeForce = d3
      .forceManyBody<ColonySimNode>()
      .strength((d) => (d.isCheckpoint ? -380 : d.isDecision ? -130 : -45))
      .distanceMax(450);

    // 3. Collision Force (prevent overlapping)
    const collideForce = d3
      .forceCollide<ColonySimNode>()
      .radius((d) => d.radius + (d.isCheckpoint ? 12 : 6))
      .iterations(2);

    // 4. Center Gravity Force (keeps the entire ecosystem bounded)
    const centerForce = d3.forceCenter<ColonySimNode>(0, 0).strength(0.03);

    simulation
      .force('link', linkForce)
      .force('charge', chargeForce)
      .force('collide', collideForce)
      .force('center', centerForce);

    // 5. Custom Checkpoint Colony Attraction & Living Ambient Drift Force
    simulation.force('colonyCluster', () => {
      const alpha = simulation.alpha();
      const nodeMap = new Map<string, ColonySimNode>();
      simNodes.forEach((n) => nodeMap.set(n.id, n));

      const time = performance.now() * 0.001;

      simNodes.forEach((node) => {
        // A. Continuous living organic micro-drift/jitter (never static!)
        if (physicsDriftEnabled && node.fx === null && node.fy === null) {
          const phase = (node.basePhase || 0) + time * (0.6 * driftSpeed);
          const jitterX = Math.cos(phase) * (0.35 * driftSpeed);
          const jitterY = Math.sin(phase * 1.3) * (0.35 * driftSpeed);
          node.vx = (node.vx || 0) + jitterX;
          node.vy = (node.vy || 0) + jitterY;
        }

        // B. Colony Gravity: Non-checkpoints are attracted toward their cluster's checkpoint center
        if (!node.isCheckpoint && node.clusterId) {
          const centerNode = nodeMap.get(node.clusterId);
          if (centerNode && centerNode.x !== undefined && centerNode.y !== undefined && node.x !== undefined && node.y !== undefined) {
            const dx = centerNode.x - node.x;
            const dy = centerNode.y - node.y;
            // Higher depth nodes cluster tighter
            const factor = colonyGravity * (1 + (node.depthFromCheckpoint || 1) * 0.15) * alpha;
            node.vx = (node.vx || 0) + dx * factor;
            node.vy = (node.vy || 0) + dy * factor;
          }
        }
      });
    });

    simRef.current = simulation;

    // Reset and center camera view on session load
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      transformRef.current = { x: width / 2, y: height / 2, k: 0.85 };
      setZoomLevel(0.85);
    }

    return () => {
      simulation.stop();
    };
  }, [session.id, physicsDriftEnabled, driftSpeed, colonyGravity]);

  // Adjust alpha target when physics drift toggle changes
  useEffect(() => {
    if (simRef.current) {
      simRef.current.alphaTarget(physicsDriftEnabled ? 0.035 : 0);
      if (physicsDriftEnabled) {
        simRef.current.restart();
      }
    }
  }, [physicsDriftEnabled]);

  // Center camera on a requested node
  useEffect(() => {
    if (!centerNodeTrigger || !containerRef.current) return;
    const targetNode = nodesRef.current.find((n) => centerNodeTrigger.startsWith(`${n.id}-`));
    if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      transformRef.current = {
        x: width / 2 - targetNode.x * 1.1,
        y: height / 2 - targetNode.y * 1.1,
        k: 1.1,
      };
      setZoomLevel(1.1);
    }
  }, [centerNodeTrigger]);

  // Main Canvas Render Loop (60 FPS with HiDPI Retina support)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    // Handle tab visibility throttling for performance
    const handleVisibilityChange = () => {
      if (document.hidden && simRef.current) {
        simRef.current.alphaTarget(0);
      } else if (!document.hidden && simRef.current && physicsDriftEnabled) {
        simRef.current.alphaTarget(0.035).restart();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply Zoom and Pan transform
      const { x: tx, y: ty, k: tk } = transformRef.current;
      ctx.translate(tx, ty);
      ctx.scale(tk, tk);

      const simNodes = nodesRef.current;
      const simLinks = linksRef.current;
      const hovered = hoveredNodeRef.current;
      const selectedId = selectedNodeId;

      // Filter highlights
      const matchesSearch = (n: ColonySimNode) => {
        if (!searchQuery) return false;
        const q = searchQuery.toLowerCase();
        return n.node.content.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
      };

      const isNodeVisible = (n: ColonySimNode) => {
        if (modelFilter !== 'all') {
          const { colorKey } = providerLabel(n.model, n.provider);
          if (colorKey !== modelFilter) return false;
        }
        if (typeFilter !== 'all' && n.type !== typeFilter) return false;
        return true;
      };

      // Set of connected nodes if a node is selected or hovered
      const activeNode = hovered || simNodes.find((n) => n.id === selectedId);
      const connectedNodeIds = new Set<string>();
      if (activeNode) {
        connectedNodeIds.add(activeNode.id);
        if (activeNode.node.prev_id) connectedNodeIds.add(activeNode.node.prev_id);
        if (activeNode.node.references) activeNode.node.references.forEach((r) => connectedNodeIds.add(r));
        simNodes.forEach((n) => {
          if (n.node.prev_id === activeNode.id) connectedNodeIds.add(n.id);
        });
      }

      // ==========================================
      // 1. DRAW LINKS / EDGES
      // ==========================================
      simLinks.forEach((link) => {
        const source = typeof link.source === 'object' ? link.source : simNodes.find((n) => n.id === link.source);
        const target = typeof link.target === 'object' ? link.target : simNodes.find((n) => n.id === link.target);

        if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) {
          return;
        }

        if (link.isReference && !showReferences) return;

        const isLinkConnected = activeNode && (source.id === activeNode.id || target.id === activeNode.id);
        const isDimmed = activeNode && !isLinkConnected;

        ctx.save();
        ctx.beginPath();

        if (link.isReference) {
          // Curved dashed line for decision references
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = isLinkConnected
            ? '#c084fc'
            : isDimmed
            ? 'rgba(147, 51, 234, 0.15)'
            : 'rgba(168, 85, 247, 0.45)';
          ctx.lineWidth = isLinkConnected ? 2 : 1.2;

          // Quadratic curve for references
          const midX = (source.x + target.x) / 2 + (source.y - target.y) * 0.2;
          const midY = (source.y + target.y) / 2 + (target.x - source.x) * 0.2;
          ctx.moveTo(source.x, source.y);
          ctx.quadraticCurveTo(midX, midY, target.x, target.y);
          ctx.stroke();
        } else {
          // Main prev_id link (solid clean line)
          ctx.setLineDash([]);
          if (link.isCrossCluster) {
            ctx.strokeStyle = isLinkConnected
              ? '#818cf8'
              : isDimmed
              ? 'rgba(148, 163, 184, 0.1)'
              : 'rgba(161, 161, 170, 0.35)';
            ctx.lineWidth = isLinkConnected ? 2.5 : 1.8;
          } else {
            ctx.strokeStyle = isLinkConnected
              ? '#818cf8'
              : isDimmed
              ? 'rgba(148, 163, 184, 0.08)'
              : 'rgba(148, 163, 184, 0.26)';
            ctx.lineWidth = isLinkConnected ? 2 : 1.1;
          }

          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();

          // Draw small directional arrow head near target
          if (!isDimmed) {
            const angle = Math.atan2(target.y - source.y, target.x - source.x);
            const arrowDist = target.radius + 4;
            const arrowX = target.x - Math.cos(angle) * arrowDist;
            const arrowY = target.y - Math.sin(angle) * arrowDist;
            const arrowSize = isLinkConnected ? 5.5 : 3.5;

            ctx.beginPath();
            ctx.fillStyle = isLinkConnected ? '#818cf8' : 'rgba(148, 163, 184, 0.5)';
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
              arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
              arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
        }

        ctx.restore();
      });

      // ==========================================
      // 2. DRAW LIVING COLONY NODES
      // ==========================================
      const timeSec = performance.now() * 0.001;

      simNodes.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return;

        const isSelected = node.id === selectedId;
        const isHovered = hovered?.id === node.id;
        const isHighlighted = matchesSearch(node);
        const isConnected = connectedNodeIds.has(node.id);
        const isDimmed = activeNode && !isConnected && !isHighlighted;
        const visibleByFilter = isNodeVisible(node);

        ctx.save();
        ctx.translate(node.x, node.y);

        if (!visibleByFilter) {
          ctx.globalAlpha = 0.15;
        } else if (isDimmed) {
          ctx.globalAlpha = 0.25;
        } else {
          ctx.globalAlpha = 1.0;
        }

        // A. Ambient Radial Glow / Halo for Checkpoints and Decisions
        if (node.isCheckpoint || isSelected || isHovered || isHighlighted) {
          const glowRadius = node.radius * (isSelected ? 2.8 : isHovered ? 2.4 : 1.8);
          const glowGrad = ctx.createRadialGradient(0, 0, node.radius * 0.5, 0, 0, glowRadius);
          glowGrad.addColorStop(0, node.glowColor);
          glowGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // B. Node Body Circle
        ctx.beginPath();
        ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // C. Distinct Border / Stroke
        if (isSelected) {
          // Selected: vibrant glowing double ring
          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 7, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(129, 140, 248, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (node.isCheckpoint) {
          // Checkpoint outer ring (Colony Center)
          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#141417';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // D. Pulsing indicator for In-Progress / Blocked status
        if (node.status === 'in_progress') {
          const pulse = (Math.sin(timeSec * 4) + 1) * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 2 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (node.status === 'blocked') {
          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = COLONY_COLORS.blocked;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // ==========================================
        // 3. LABELS (Obsidian Graph Typography)
        // ==========================================
        const shouldShowLabel =
          showAllLabels ||
          node.isCheckpoint ||
          isSelected ||
          isHovered ||
          isHighlighted ||
          (node.isDecision && tk > 0.75);

        if (shouldShowLabel && visibleByFilter && !isDimmed) {
          ctx.font = node.isCheckpoint
            ? '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            : node.isDecision
            ? '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            : '400 10px monospace';

          const labelText = node.label;
          const textX = node.radius + 6;
          const textY = 3.5;

          // Subtle text shadow / background for readability over dense edges
          ctx.shadowColor = 'rgba(16, 16, 19, 0.9)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          ctx.fillStyle = node.isCheckpoint
            ? '#fce7f3'
            : isSelected
            ? '#ffffff'
            : node.isDecision
            ? '#e9d5ff'
            : '#d1d5db';

          ctx.fillText(labelText, textX, textY);
          ctx.shadowColor = 'transparent';
        }

        ctx.restore();
      });

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedNodeId, showAllLabels, showReferences, modelFilter, typeFilter, searchQuery]);

  // ==========================================
  // MOUSE & TOUCH INTERACTION (DRAGGING, HIT TESTING, PAN/ZOOM)
  // ==========================================

  // Screen to World coordinates transform
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const { x, y, k } = transformRef.current;
    return {
      x: (screenX - x) / k,
      y: (screenY - y) / k,
    };
  }, []);

  // Hit test to find node under pointer in world coordinates
  const findNodeAt = useCallback(
    (screenX: number, screenY: number): ColonySimNode | null => {
      const world = screenToWorld(screenX, screenY);
      const simNodes = nodesRef.current;

      // Check in reverse order so topmost rendered nodes are hit first
      for (let i = simNodes.length - 1; i >= 0; i--) {
        const node = simNodes[i];
        if (node.x === undefined || node.y === undefined) continue;
        const dx = node.x - world.x;
        const dy = node.y - world.y;
        const hitRadius = Math.max(node.radius + 6, 14); // Generous touch target
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return node;
        }
      }
      return null;
    },
    [screenToWorld]
  );

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const hitNode = findNodeAt(screenX, screenY);
    dragStartPosRef.current = { x: screenX, y: screenY };

    if (hitNode) {
      // Pin node for physical drag reaction
      isDraggingRef.current = true;
      draggedNodeRef.current = hitNode;
      const world = screenToWorld(screenX, screenY);
      hitNode.fx = world.x;
      hitNode.fy = world.y;

      // Wake up simulation aggressively to pull connected colony
      if (simRef.current) {
        simRef.current.alphaTarget(0.3).restart();
      }
    } else {
      // Pan canvas background
      isPanningRef.current = true;
      panStartPosRef.current = {
        x: screenX - transformRef.current.x,
        y: screenY - transformRef.current.y,
      };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      const world = screenToWorld(screenX, screenY);
      draggedNodeRef.current.fx = world.x;
      draggedNodeRef.current.fy = world.y;
    } else if (isPanningRef.current) {
      transformRef.current.x = screenX - panStartPosRef.current.x;
      transformRef.current.y = screenY - panStartPosRef.current.y;
    } else {
      // Hover detection
      const hit = findNodeAt(screenX, screenY);
      hoveredNodeRef.current = hit;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const dx = screenX - dragStartPosRef.current.x;
    const dy = screenY - dragStartPosRef.current.y;
    const moveDist = Math.sqrt(dx * dx + dy * dy);

    if (isDraggingRef.current && draggedNodeRef.current) {
      const dragged = draggedNodeRef.current;

      // If minimal movement (< 5px), treat as CLICK selection!
      if (moveDist < 5) {
        onSelectNode(dragged.id);
      }

      // Release pin so node drifts back into ambient colony physics
      dragged.fx = null;
      dragged.fy = null;
      draggedNodeRef.current = null;
      isDraggingRef.current = false;

      // Restore baseline alpha target
      if (simRef.current) {
        simRef.current.alphaTarget(physicsDriftEnabled ? 0.035 : 0);
      }
    }

    isPanningRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const currentK = transformRef.current.k;
    const newK = Math.max(0.15, Math.min(3.5, currentK * zoomFactor));

    // Zoom centered on pointer
    const currentX = transformRef.current.x;
    const currentY = transformRef.current.y;

    transformRef.current = {
      x: screenX - (screenX - currentX) * (newK / currentK),
      y: screenY - (screenY - currentY) * (newK / currentK),
      k: newK,
    };
    setZoomLevel(newK);
  };

  // Fit View
  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const simNodes = nodesRef.current;
    if (simNodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    simNodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
    });

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;
    const scale = Math.max(0.25, Math.min(1.2, Math.min(width / graphWidth, height / graphHeight)));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    transformRef.current = {
      x: width / 2 - midX * scale,
      y: height / 2 - midY * scale,
      k: scale,
    };
    setZoomLevel(scale);
  }, []);

  // Stats calculation
  const checkpointsCount = useMemo(
    () => session.nodes.filter((n) => n.type === 'checkpoint').length,
    [session.nodes]
  );
  const decisionsCount = useMemo(
    () => session.nodes.filter((n) => n.type === 'decision').length,
    [session.nodes]
  );
  const turnsCount = useMemo(
    () => session.nodes.filter((n) => n.type === 'turn').length,
    [session.nodes]
  );

  return (
    <div
      ref={containerRef}
      id="obsidian-living-colony-container"
      className="relative w-full h-full flex flex-col bg-[#101013] overflow-hidden select-none"
    >
      {/* Top Obsidian-Style Toolbar */}
      <div className="h-14 px-4 bg-[#141417] border-b border-[#24242c] flex items-center justify-between z-10 shrink-0">
        {/* Session Title & Colony Stats */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-[#efeff6] truncate tracking-tight">
              {session.title}
            </h2>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-[#20202a] text-[#a0a1b5] border border-[#2b2b38]">
              {session.nodes.length} nodes
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-[#282834] text-[11px]">
            <span className="flex items-center gap-1.5 text-pink-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899] shadow-xs shadow-pink-500/50" />
              {checkpointsCount} Colonies
            </span>
            <span className="flex items-center gap-1.5 text-purple-300">
              <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              {decisionsCount} Decisions
            </span>
            <span className="flex items-center gap-1.5 text-[#9da0b5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              {turnsCount} Turns
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Highlight */}
          <div className="relative hidden md:block w-44">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7085]" />
            <input
              id="colony-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Highlight node..."
              className="w-full bg-[#1b1b21] border border-[#2a2a35] rounded-lg pl-7 pr-2.5 py-1 text-xs text-[#e1e2ec] placeholder-[#646578] focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {/* Living Drift Toggle */}
          <button
            id="toggle-physics-drift-btn"
            onClick={() => setPhysicsDriftEnabled(!physicsDriftEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              physicsDriftEnabled
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/50 shadow-xs'
                : 'bg-[#1c1c22] text-[#7d7e93] border-[#292936] hover:text-[#b4b5c7]'
            }`}
            title={physicsDriftEnabled ? 'Living physics active (continuous drift)' : 'Physics paused'}
          >
            {physicsDriftEnabled ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Living Colony</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" />
                <span>Frozen</span>
              </>
            )}
          </button>

          {/* Labels Toggle */}
          <button
            id="toggle-labels-btn"
            onClick={() => setShowAllLabels(!showAllLabels)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showAllLabels
                ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60'
                : 'bg-[#1c1c22] text-[#86879c] hover:text-[#e4e5f0] border-[#292936]'
            }`}
            title="Toggle All Node Labels"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Physics & Gravity Settings Slider Panel Toggle */}
          <button
            id="toggle-colony-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showSettings
                ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60'
                : 'bg-[#1c1c22] text-[#86879c] hover:text-[#e4e5f0] border-[#292936]'
            }`}
            title="Colony Physics Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Fit View */}
          <button
            id="colony-fit-view-btn"
            onClick={handleFitView}
            className="p-1.5 rounded-lg bg-[#1c1c22] hover:bg-[#252530] text-[#86879c] hover:text-[#e4e5f0] border border-[#292936] transition-colors"
            title="Reset / Fit View"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>

          {/* Legend */}
          <button
            id="toggle-colony-legend-btn"
            onClick={() => setShowLegend(!showLegend)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showLegend
                ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60'
                : 'bg-[#1c1c22] text-[#86879c] hover:text-[#e4e5f0] border-[#292936]'
            }`}
            title="Visual Legend"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Living Colony Canvas */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-full block bg-[#101013]"
        />

        {/* Ambient Colony HUD (Bottom-left) */}
        <div className="absolute bottom-4 left-4 pointer-events-none bg-[#141419]/90 backdrop-blur-md border border-[#282834] rounded-xl px-3 py-2 text-[11px] text-[#8f90a4] shadow-xl flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-500 shadow-xs shadow-pink-500" />
            <span className="text-pink-200 font-medium">Checkpoint Hubs</span>
          </div>
          <span className="text-[#3c3d4c]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>OpenAI</span>
          </div>
          <span className="text-[#3c3d4c]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Gemini</span>
          </div>
          <span className="text-[#3c3d4c]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Claude</span>
          </div>
          <span className="text-[#3c3d4c]">•</span>
          <span className="font-mono text-[10px] text-[#6d6e82]">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Live Interaction Tip (Top-left floating) */}
        <div className="absolute top-3 left-4 pointer-events-none bg-[#16161c]/80 backdrop-blur-xs border border-[#292936] rounded-lg px-2.5 py-1 text-[11px] text-[#7d7e94] flex items-center gap-2">
          <span className="text-indigo-400 font-semibold">Tip:</span>
          <span>Drag nodes to pull colony physics • Click to inspect memory payload</span>
        </div>

        {/* Physics Sliders Dropdown (Obsidian Graph Controls style) */}
        {showSettings && (
          <div
            id="colony-settings-modal"
            className="absolute top-3 right-4 w-72 bg-[#16161c]/95 backdrop-blur-md border border-[#2b2b38] rounded-xl p-4 shadow-2xl z-20 space-y-3.5 text-xs text-[#d2d3e0]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#282834]">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f1f1f5]">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Colony Physics Engine</span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[#78798d] hover:text-[#f0f1f8]"
              >
                ✕
              </button>
            </div>

            {/* Drift Jitter Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#9697ab]">Organic Drift / Jitter:</span>
                <span className="font-mono text-indigo-400">{driftSpeed.toFixed(1)}x</span>
              </div>
              <input
                id="drift-slider"
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={driftSpeed}
                onChange={(e) => setDriftSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-[#252532] rounded-lg cursor-pointer"
              />
            </div>

            {/* Colony Gravity Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#9697ab]">Checkpoint Cluster Pull:</span>
                <span className="font-mono text-indigo-400">{(colonyGravity * 100).toFixed(0)}%</span>
              </div>
              <input
                id="gravity-slider"
                type="range"
                min="0.01"
                max="0.20"
                step="0.01"
                value={colonyGravity}
                onChange={(e) => setColonyGravity(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-[#252532] rounded-lg cursor-pointer"
              />
            </div>

            {/* Model Filter */}
            <div className="space-y-1.5 pt-1 border-t border-[#262632]">
              <span className="text-[11px] text-[#9697ab] block">Filter Model:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['all', 'openai', 'gemini', 'claude'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModelFilter(m)}
                    className={`py-1 rounded text-[11px] font-medium uppercase border transition-colors ${
                      modelFilter === m
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                        : 'bg-[#1b1b22] text-[#797a8e] border-[#282834]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* References Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-[#262632] text-[11px]">
              <span className="text-[#9697ab]">Show Cross-References:</span>
              <button
                onClick={() => setShowReferences(!showReferences)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  showReferences
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                    : 'bg-[#22222b] text-[#77788b] border-[#2d2d3a]'
                }`}
              >
                {showReferences ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>
        )}

        {/* Legend Modal */}
        {showLegend && (
          <div
            id="colony-legend-modal"
            className="absolute top-3 right-4 w-80 bg-[#16161c]/95 backdrop-blur-md border border-[#2b2b38] rounded-xl p-4 shadow-2xl z-20 space-y-3 text-xs text-[#d2d3e0]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#282834]">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f1f1f5]">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Obsidian Living Colony Guide</span>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="text-[#78798d] hover:text-[#f0f1f8]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#ec4899] shadow-sm shadow-pink-500/60 shrink-0 border border-pink-300/40" />
                <div>
                  <p className="font-semibold text-pink-300">Checkpoint (Colony Hub)</p>
                  <p className="text-[10px] text-[#7d7e93]">
                    Largest node. Consolidated snapshot that pulls related turns into a tight dense colony.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6] shrink-0 border border-purple-400/40" />
                <div>
                  <p className="font-semibold text-purple-300">Decision Point</p>
                  <p className="text-[10px] text-[#7d7e93]">
                    Medium node. Strategy forks or gateway handoffs, linked via dashed cross-reference lines.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                </div>
                <div>
                  <p className="font-semibold text-[#e1e2ed]">Conversation Turns</p>
                  <p className="text-[10px] text-[#7d7e93]">
                    Small particles: Emerald = OpenAI, Cyan = Gemini, Amber = Claude. Drift organically with spring forces.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#262632] space-y-1.5 text-[11px] text-[#8e8fa3]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-[#94a3b8]" />
                  <span>Solid Line: Parent-child memory chain (prev_id)</span>
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <span className="w-6 h-0.5 border-t border-dashed border-purple-400" />
                  <span>Dashed Line: Decision reference links</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
