import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ProviderLabel =
  | 'OpenAI (GPT)'
  | 'Google Gemini'
  | 'Anthropic Claude'
  | 'NVIDIA NIM';

export interface KnowledgeNodeData {
  id: string;
  title: string;
  cat: string;
  provider: ProviderLabel;
  checkpoint: boolean;
  ageHours: number;
  color: number;
  pos: [number, number, number];
  callout?: boolean;
  desc: string;
  code: string;
}

export type GlobeMode = 'room' | 'island' | 'mindmap' | 'connect';
type PanelTabView = 'room' | 'cluster' | 'mindmap';

export const KNOWLEDGE_NODES: KnowledgeNodeData[] = [
  {
    id: 'kg',
    title: 'Knowledge Graph',
    cat: 'Core Architecture',
    provider: 'Google Gemini',
    checkpoint: true,
    ageHours: 0.4,
    color: 0x00e5ff,
    pos: [-21, 7, 10],
    callout: true,
    desc: 'Master spatial memory index linking 19+ active Luau modules, world assets, and agent thoughts.',
    code: '-- Graph Sync\nGraph:Link("RoomCore", "GlobeMesh")',
  },
  {
    id: 'pd',
    title: 'Project Data',
    cat: 'Workspace State',
    provider: 'OpenAI (GPT)',
    checkpoint: false,
    ageHours: 3,
    color: 0x38bdf8,
    pos: [-22, -4, 12],
    callout: true,
    desc: 'Structured JSON scene hierarchy containing Terrain, Props, Checkpoints, and NPC patrol waypoints.',
    code: 'workspace.TerrainFolder:GetChildren()\n-- 4 landmarks • 4-stud grid',
  },
  {
    id: 'as',
    title: 'Avatar Scripts',
    cat: 'Luau Logic',
    provider: 'Anthropic Claude',
    checkpoint: true,
    ageHours: 0.8,
    color: 0x8b5cf6,
    pos: [21, 6, 11],
    callout: true,
    desc: 'Character controller, checkpoint stage persistence, and leaderstats synchronization.',
    code: 'Players.PlayerAdded:Connect(function(plr)\n  stage.Value = 0\nend)',
  },
  {
    id: 'wa',
    title: 'World Assets',
    cat: '3D Geometry',
    provider: 'NVIDIA NIM',
    checkpoint: false,
    ageHours: 14,
    color: 0x3b82f6,
    pos: [22, -5, 9],
    callout: true,
    desc: 'Low-poly blocky meshes, Neon crystals, mushroom lamps, and smooth matte plastic materials.',
    code: 'CrystalSpire.Material = Enum.Material.Neon\nCrystalSpire.Size = Vector3.new(8, 24, 8)',
  },
  {
    id: 'lc',
    title: 'Live Connections',
    cat: 'Agent Streams',
    provider: 'Google Gemini',
    checkpoint: false,
    ageHours: 0.2,
    color: 0xf472b6,
    pos: [14, -15, 13],
    callout: true,
    desc: 'Real-time synaptic data streams emitted by sub-agent bots from the coding desk to the globe.',
    code: 'RunService.Heartbeat:Connect(streamPulse)',
  },
  {
    id: 'n6',
    title: 'Checkpoint Manager',
    cat: 'Luau Logic',
    provider: 'Anthropic Claude',
    checkpoint: true,
    ageHours: 1.5,
    color: 0x00e5ff,
    pos: [-14, 17, 7],
    desc: 'Tracks player stage progress with Neon activation feedback.',
    code: 'if cpStage > stageStat.Value then ... end',
  },
  {
    id: 'n7',
    title: 'Moving Platforms',
    cat: '3D Geometry',
    provider: 'NVIDIA NIM',
    checkpoint: false,
    ageHours: 18,
    color: 0x3b82f6,
    pos: [12, 18, -8],
    desc: 'Cosine-eased bridge platforms with AssemblyLinearVelocity rider carry.',
    code: 'part.AssemblyLinearVelocity = delta / dt',
  },
  {
    id: 'n8',
    title: 'GuardBot Patrol',
    cat: 'Agent Streams',
    provider: 'OpenAI (GPT)',
    checkpoint: false,
    ageHours: 36,
    color: 0xf472b6,
    pos: [-18, -12, -10],
    desc: 'Autonomous courtyard NPC cycling 4 patrol waypoints safely.',
    code: 'humanoid:MoveTo(target.Position)',
  },
  {
    id: 'n9',
    title: 'Collectible Gems',
    cat: '3D Geometry',
    provider: 'NVIDIA NIM',
    checkpoint: false,
    ageHours: 72,
    color: 0x00e5ff,
    pos: [6, 21, 6],
    desc: 'Spinning Neon gems with 15s respawn cooldown.',
    code: 'gemStat.Value += gem:GetAttribute("Value")',
  },
  {
    id: 'n10',
    title: 'Lighting Rig',
    cat: '3D Geometry',
    provider: 'Google Gemini',
    checkpoint: true,
    ageHours: 5,
    color: 0x8b5cf6,
    pos: [-6, 20, -11],
    desc: 'High-contrast ShadowMap lighting with Atmosphere & NeonBloom.',
    code: 'Lighting.ClockTime = 14.5',
  },
  {
    id: 'n11',
    title: 'QA Playtest Audit',
    cat: 'Workspace State',
    provider: 'OpenAI (GPT)',
    checkpoint: true,
    ageHours: 0.6,
    color: 0x38bdf8,
    pos: [18, 12, -12],
    desc: 'Automated startup assertions for welds, anchoring, and collisions.',
    code: 'assert(part.Anchored, "Unanchored part")',
  },
  {
    id: 'n12',
    title: 'Pegboard Notes',
    cat: 'Core Architecture',
    provider: 'Anthropic Claude',
    checkpoint: false,
    ageHours: 120,
    color: 0xf472b6,
    pos: [-12, -18, 8],
    desc: 'Pinned visual reminders and spatial ideas inside the creator room.',
    code: '-- StickyNote: "Add Obby Bridge v2"',
  },
  {
    id: 'n13',
    title: 'Sub-Agent Bots',
    cat: 'Agent Streams',
    provider: 'Google Gemini',
    checkpoint: false,
    ageHours: 0.9,
    color: 0x00e5ff,
    pos: [4, -21, -7],
    desc: '3 mini blocky AI assistants scanning scripts and streaming telemetry.',
    code: 'AgentBot:Transmit("KnowledgeGlobe")',
  },
  {
    id: 'n14',
    title: 'Crystal Spire',
    cat: '3D Geometry',
    provider: 'NVIDIA NIM',
    checkpoint: false,
    ageHours: 96,
    color: 0x3b82f6,
    pos: [24, 2, -6],
    desc: 'Glowing cyan landmark on the elevated island.',
    code: 'Position = Vector3.new(132, 20, -12)',
  },
  {
    id: 'n15',
    title: 'Spawn Plaza',
    cat: 'Workspace State',
    provider: 'OpenAI (GPT)',
    checkpoint: true,
    ageHours: 22,
    color: 0x38bdf8,
    pos: [-24, 3, -4],
    desc: 'Central 48x48 hub with Stage 0 SpawnLocation.',
    code: 'PlazaPad.Size = Vector3.new(48, 1, 48)',
  },
  {
    id: 'n16',
    title: 'Terrain Grid',
    cat: 'Workspace State',
    provider: 'NVIDIA NIM',
    checkpoint: false,
    ageHours: 240,
    color: 0x8b5cf6,
    pos: [0, 22, -4],
    desc: '4-stud snapped low-poly baseplate and island elevation.',
    code: 'grid_unit_studs = 4',
  },
  {
    id: 'n17',
    title: 'Orbiting Rings',
    cat: 'Core Architecture',
    provider: 'Anthropic Claude',
    checkpoint: false,
    ageHours: 48,
    color: 0xf472b6,
    pos: [-10, 14, -16],
    desc: 'Satellite data rings storing external docs and transcripts.',
    code: 'ring.RotationSpeed = 0.25',
  },
  {
    id: 'n18',
    title: 'Hologram UI',
    cat: 'Core Architecture',
    provider: 'Google Gemini',
    checkpoint: true,
    ageHours: 0.3,
    color: 0x00e5ff,
    pos: [16, -11, -14],
    desc: 'Spatial search bar and mode switcher HUD.',
    code: 'ModeToggle:Set("Mind Map")',
  },
  {
    id: 'n19',
    title: 'Telemetry Stream',
    cat: 'Agent Streams',
    provider: 'OpenAI (GPT)',
    checkpoint: false,
    ageHours: 12,
    color: 0x8b5cf6,
    pos: [-4, -16, -16],
    desc: 'Energy pulses bridging the coding desk to outer clusters.',
    code: 'Stream:Pulse(origin, target)',
  },
];

const PROVIDERS: Array<{ label: ProviderLabel; color: string }> = [
  { label: 'OpenAI (GPT)', color: '#10B981' },
  { label: 'Google Gemini', color: '#3B82F6' },
  { label: 'Anthropic Claude', color: '#F97316' },
  { label: 'NVIDIA NIM', color: '#84CC16' },
];

const TIME_WINDOWS = [
  { label: '1H', hours: 1 },
  { label: '24H', hours: 24 },
  { label: '7D', hours: 168 },
  { label: 'ALL', hours: 0 },
];

const CAMERA_PRESETS: Record<
  GlobeMode,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  room: { pos: [8.5, 4.5, 9.5], target: [0, 0.2, -1.5] },
  island: { pos: [16, 11, 18], target: [0, 0, 0] },
  mindmap: { pos: [42, 26, 62], target: [0, 1.5, 0] },
  connect: { pos: [-38, 18, 56], target: [0, 0, 0] },
};

interface MakeBoxOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  emissive?: boolean;
  emissiveColor?: number;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  map?: THREE.Texture | null;
  noShadow?: boolean;
}

export const KnowledgeGlobeBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const calloutsLayerRef = useRef<HTMLDivElement | null>(null);
  const calloutSvgRef = useRef<SVGSVGElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<GlobeMode>('mindmap');
  const [panelTab, setPanelTab] = useState<PanelTabView>('cluster');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNodeData | null>(KNOWLEDGE_NODES[0]);
  const [copiedUri, setCopiedUri] = useState(false);

  // Search & filter popover state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledProviders, setEnabledProviders] = useState<Record<ProviderLabel, boolean>>({
    'OpenAI (GPT)': true,
    'Google Gemini': true,
    'Anthropic Claude': true,
    'NVIDIA NIM': true,
  });
  const [checkpointOnly, setCheckpointOnly] = useState(false);
  const [maxHours, setMaxHours] = useState(0);

  const modeRef = useRef<GlobeMode>('mindmap');
  const selectedIdRef = useRef<string | null>(KNOWLEDGE_NODES[0].id);
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);
  const focusNodeFnRef = useRef<((nodeId: string) => void) | null>(null);
  const setSceneModeFnRef = useRef<((m: GlobeMode) => void) | null>(null);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return KNOWLEDGE_NODES.filter((n) => {
      const provOk = enabledProviders[n.provider];
      const cpOk = !checkpointOnly || n.checkpoint;
      const timeOk = maxHours === 0 || n.ageHours <= maxHours;
      const qOk =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.cat.toLowerCase().includes(q) ||
        n.provider.toLowerCase().includes(q);
      return provOk && cpOk && timeOk && qOk;
    });
  }, [searchQuery, enabledProviders, checkpointOnly, maxHours]);

  // Highlight matching nodes in 3D globe whenever filters change
  useEffect(() => {
    const matchIds = new Set(filteredMatches.map((m) => m.id));
    interactiveMeshesRef.current.forEach((orb) => {
      const data = orb.userData.nodeData as KnowledgeNodeData | undefined;
      if (!data) return;
      const isMatch = matchIds.has(data.id);
      const mat = orb.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isMatch ? (data.callout ? 1.8 : 1.35) : 0.18;
      mat.opacity = isMatch ? 1 : 0.25;
      mat.transparent = !isMatch;
      mat.needsUpdate = true;
    });
  }, [filteredMatches]);

  // Close search popover on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedNode?.id ?? null;
  }, [selectedNode]);

  useEffect(() => {
    const container = containerRef.current;
    const calloutsLayer = calloutsLayerRef.current;
    const calloutSvg = calloutSvgRef.current;
    if (!container || !calloutsLayer || !calloutSvg) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a12);
    scene.fog = new THREE.FogExp2(0x080a12, 0.0045);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.5, 600);
    camera.position.set(42, 26, 62);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';
    container.insertBefore(renderer.domElement, container.firstChild);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 130;
    controls.target.set(0, 1.5, 0);

    // Lighting: Warm cozy studio interior vs. subtle cool outer globe rims (calibrated for Three r187 physical units)
    const hemiLight = new THREE.HemisphereLight(0xffe7c2, 0x3b2d44, 1.35);
    scene.add(hemiLight);

    const ambient = new THREE.AmbientLight(0x47384f, 0.95);
    scene.add(ambient);

    const deskWarmLight = new THREE.PointLight(0xffb86c, 58, 26, 1.35);
    deskWarmLight.position.set(0, 3.6, -0.4);
    deskWarmLight.castShadow = true;
    scene.add(deskWarmLight);

    const pegboardWarmLight = new THREE.PointLight(0xffd7a3, 22, 14, 1.4);
    pegboardWarmLight.position.set(-1.8, 3.0, -4.2);
    scene.add(pegboardWarmLight);

    const mushroomPinkLight = new THREE.PointLight(0xff66b2, 16, 11, 1.4);
    mushroomPinkLight.position.set(1.35, 0.9, -3.2);
    scene.add(mushroomPinkLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00e5ff, 0.75);
    cyanRimLight.position.set(-30, 35, 30);
    scene.add(cyanRimLight);

    const violetRimLight = new THREE.DirectionalLight(0xa855f7, 0.6);
    violetRimLight.position.set(35, -15, -25);
    scene.add(violetRimLight);

    function makeBox(
      w: number,
      h: number,
      d: number,
      color: number,
      opts: MakeBoxOpts = {}
    ) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = opts.emissive
        ? new THREE.MeshStandardMaterial({
            color,
            emissive: opts.emissiveColor ?? color,
            emissiveIntensity: opts.emissiveIntensity ?? 1.2,
            roughness: 0.25,
            map: opts.map ?? null,
          })
        : new THREE.MeshStandardMaterial({
            color,
            roughness: opts.roughness !== undefined ? opts.roughness : 0.6,
            metalness: opts.metalness ?? 0.05,
            map: opts.map ?? null,
          });
      const mesh = new THREE.Mesh(geo, mat);
      if (opts.pos) mesh.position.set(...opts.pos);
      if (opts.rot) mesh.rotation.set(...opts.rot);
      mesh.castShadow = !opts.noShadow;
      mesh.receiveShadow = true;
      return mesh;
    }

    const createdTextures: THREE.Texture[] = [];
    const trackTex = (tex: THREE.Texture) => {
      createdTextures.push(tex);
      return tex;
    };

    // =========================================================
    // 1. CENTER CORE: GLASS-ENCASED ROBLOX CREATOR'S STUDIO ROOM
    // =========================================================
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    function makeHerringboneTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#7c4c29';
        ctx.fillRect(0, 0, 256, 256);
        const tones = ['#8c5730', '#734423', '#966037', '#683c1e'];
        for (let y = 0; y < 256; y += 16) {
          for (let x = 0; x < 256; x += 32) {
            ctx.fillStyle = tones[(x / 32 + y / 16) % tones.length];
            ctx.fillRect(x + 1, y + 1, 30, 14);
          }
        }
      }
      const tex = trackTex(new THREE.CanvasTexture(c));
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      return tex;
    }

    function makeWoodTileTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#6f4224';
        ctx.fillRect(0, 0, 256, 256);
        const tones = ['#8a5530', '#754626', '#9b633b', '#663b1f'];
        for (let y = 0; y < 256; y += 32) {
          for (let x = 0; x < 256; x += 32) {
            ctx.fillStyle = tones[((x / 32) * 3 + y / 32) % tones.length];
            ctx.fillRect(x + 1, y + 1, 30, 30);
          }
        }
      }
      const tex = trackTex(new THREE.CanvasTexture(c));
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return tex;
    }

    function makeRugTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 192;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2c2233';
        ctx.fillRect(0, 0, 256, 192);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 10;
        ctx.strokeRect(10, 10, 236, 172);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.strokeRect(22, 22, 212, 148);
        const dots = ['#38bdf8', '#f472b6', '#4ade80', '#facc15'];
        for (let x = 40; x <= 216; x += 22) {
          ctx.fillStyle = dots[(x / 22) % dots.length];
          ctx.beginPath();
          ctx.arc(x, 42, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, 150, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return trackTex(new THREE.CanvasTexture(c));
    }

    function makeCodeScreenTexture(accentHex: string) {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 160;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0b1020';
        ctx.fillRect(0, 0, 256, 160);
        ctx.fillStyle = '#151e36';
        ctx.fillRect(0, 0, 56, 160);
        ctx.fillRect(56, 0, 200, 18);
        const cols = ['#38bdf8', accentHex, '#a78bfa', '#4ade80', '#f472b6'];
        for (let i = 0; i < 11; i++) {
          ctx.fillStyle = cols[i % cols.length];
          const indent = (i % 3) * 12;
          const w = 45 + ((i * 37) % 105);
          ctx.fillRect(68 + indent, 28 + i * 11, w, 5);
        }
      }
      return trackTex(new THREE.CanvasTexture(c));
    }

    function makeCuttingMatTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 192;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#157347';
        ctx.fillRect(0, 0, 256, 192);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, 236, 172);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        for (let x = 24; x < 240; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 12);
          ctx.lineTo(x, 180);
          ctx.stroke();
        }
        for (let y = 24; y < 180; y += 20) {
          ctx.beginPath();
          ctx.moveTo(12, y);
          ctx.lineTo(244, y);
          ctx.stroke();
        }
      }
      return trackTex(new THREE.CanvasTexture(c));
    }

    // Grassy Floating Island Base beneath the Glass Pavilion
    roomGroup.add(
      makeBox(14.8, 0.7, 13.6, 0x2f6e33, { pos: [0, -2.95, 0], roughness: 0.9 }),
      makeBox(14.0, 0.5, 12.8, 0x3f8a43, { pos: [0, -2.55, 0], roughness: 0.85 })
    );

    // Warm Herringbone Hardwood Floor
    roomGroup.add(
      makeBox(11.8, 0.35, 10.8, 0xffffff, {
        pos: [0, -2.25, 0],
        roughness: 0.45,
        map: makeHerringboneTexture(),
      })
    );

    // Patterned Woven Center Rug
    roomGroup.add(
      makeBox(4.8, 0.06, 3.6, 0xffffff, {
        pos: [0.4, -2.04, 1.35],
        roughness: 0.9,
        map: makeRugTexture(),
      })
    );

    // Wooden Entry Stairs (front-right, leading up into the glass pavilion)
    for (let s = 0; s < 4; s++) {
      roomGroup.add(
        makeBox(2.2, 0.22, 0.55, 0x9c6236, { pos: [3.2, -2.9 + s * 0.22, 6.9 - s * 0.5] })
      );
    }

    // Black Steel Glass Pavilion Structure (columns, roof beams & subtle glass walls)
    const frameMatPos: Array<[number, number, number]> = [
      [-5.85, 0.9, -5.35],
      [5.85, 0.9, -5.35],
      [-5.85, 0.9, 5.35],
      [5.85, 0.9, 5.35],
      [0, 0.9, 5.35],
      [-5.85, 0.9, 0],
      [5.85, 0.9, 0],
    ];
    frameMatPos.forEach((p) => {
      roomGroup.add(makeBox(0.24, 6.4, 0.24, 0x0f172a, { pos: p }));
    });
    roomGroup.add(
      makeBox(11.9, 0.22, 0.24, 0x0f172a, { pos: [0, 4.1, -5.35] }),
      makeBox(11.9, 0.22, 0.24, 0x0f172a, { pos: [0, 4.1, 5.35] }),
      makeBox(0.24, 0.22, 10.9, 0x0f172a, { pos: [-5.85, 4.1, 0] }),
      makeBox(0.24, 0.22, 10.9, 0x0f172a, { pos: [5.85, 4.1, 0] }),
      makeBox(11.8, 0.16, 0.16, 0x0f172a, { pos: [0, 4.1, 0] }),
      makeBox(0.16, 0.16, 10.8, 0x0f172a, { pos: [0, 4.1, 0] })
    );

    // Subtle clear glass wall panels on front & left
    const glassPaneMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.045,
      roughness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 6.1), glassPaneMat);
    frontGlass.position.set(0, 0.95, 5.35);
    const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 6.1), glassPaneMat);
    leftGlass.position.set(-5.85, 0.95, 0);
    leftGlass.rotation.y = Math.PI / 2;
    roomGroup.add(frontGlass, leftGlass);

    // Back Dark Pegboard Wall + Warm Top LED Strip
    roomGroup.add(
      makeBox(11.6, 6.1, 0.28, 0x131620, { pos: [0, 0.95, -5.2], roughness: 0.75 }),
      makeBox(6.8, 4.2, 0.12, 0x1b1f2c, { pos: [-1.8, 1.4, -5.02] }),
      makeBox(6.8, 0.14, 0.28, 0xffe4b5, {
        pos: [-1.8, 3.52, -4.95],
        emissive: true,
        emissiveColor: 0xffcf87,
        emissiveIntensity: 1.3,
      })
    );

    // Pegboard items: Coiled green cable, sticky notes, blocky headphones, art frames, (X) sign
    const cableRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.07, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 })
    );
    cableRing.position.set(-4.3, 2.35, -4.92);
    roomGroup.add(cableRing);

    [0xfef08a, 0xf472b6, 0x38bdf8].forEach((col, i) => {
      roomGroup.add(
        makeBox(0.38, 0.42, 0.04, col, {
          pos: [-4.6 + i * 0.48, 1.35, -4.94],
          emissive: true,
          emissiveIntensity: 0.35,
        })
      );
    });
    roomGroup.add(
      makeBox(0.68, 0.14, 0.14, 0xf8fafc, { pos: [-0.3, 2.65, -4.92] }),
      makeBox(0.22, 0.42, 0.22, 0xe2e8f0, { pos: [-0.6, 2.35, -4.92] }),
      makeBox(0.22, 0.42, 0.22, 0xe2e8f0, { pos: [0.0, 2.35, -4.92] }),
      makeBox(0.95, 1.25, 0.06, 0xf8fafc, { pos: [2.2, 2.45, -4.98] }),
      makeBox(0.45, 0.45, 0.08, 0xef4444, { pos: [2.2, 2.45, -4.96] }),
      makeBox(0.95, 1.25, 0.06, 0xf8fafc, { pos: [3.35, 2.45, -4.98] }),
      makeBox(0.45, 0.45, 0.08, 0x38bdf8, { pos: [3.35, 2.45, -4.96] })
    );
    const xRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0xf472b6,
        emissiveIntensity: 1.2,
      })
    );
    xRing.position.set(2.8, 1.35, -4.96);
    roomGroup.add(xRing);

    // Right Wooden Checker-Slat Accent Wall + Climbing Vine Leaves
    roomGroup.add(
      makeBox(0.32, 6.1, 10.6, 0xffffff, { pos: [5.68, 0.95, 0], map: makeWoodTileTexture() })
    );
    for (let v = 0; v < 8; v++) {
      roomGroup.add(
        makeBox(0.22, 0.14, 0.42, 0x22c55e, {
          pos: [5.46, 3.6 - v * 0.58, -1.5 + (v % 2) * 0.25],
          rot: [0, 0.2, 0.2],
        })
      );
    }

    // Long Wooden Coding Desk (Back-Left)
    roomGroup.add(
      makeBox(6.8, 0.24, 2.1, 0x8d5832, { pos: [-1.4, -0.38, -3.55], roughness: 0.45 }),
      makeBox(1.2, 1.7, 1.9, 0x1e293b, { pos: [-4.0, -1.35, -3.55] }),
      makeBox(1.2, 1.7, 1.9, 0x1e293b, { pos: [1.2, -1.35, -3.55] })
    );

    // Dual Monitors with Crisp Code & World Preview Textures
    const codeTex1 = makeCodeScreenTexture('#00e5ff');
    const codeTex2 = makeCodeScreenTexture('#f472b6');
    roomGroup.add(
      makeBox(2.05, 1.28, 0.1, 0x0f172a, { pos: [-2.45, 0.65, -4.1], rot: [0, 0.12, 0] }),
      makeBox(1.92, 1.15, 0.12, 0xffffff, {
        pos: [-2.45, 0.65, -4.09],
        rot: [0, 0.12, 0],
        map: codeTex1,
        emissive: true,
        emissiveColor: 0x38bdf8,
        emissiveIntensity: 0.55,
      }),
      makeBox(1.95, 1.22, 0.1, 0x0f172a, { pos: [-0.25, 0.62, -4.05], rot: [0, -0.15, 0] }),
      makeBox(1.82, 1.08, 0.12, 0xffffff, {
        pos: [-0.25, 0.62, -4.04],
        rot: [0, -0.15, 0],
        map: codeTex2,
        emissive: true,
        emissiveColor: 0xa855f7,
        emissiveIntensity: 0.5,
      })
    );

    // Desk Mat, Keyboard & Glowing Pink Mushroom Lamp
    roomGroup.add(
      makeBox(1.8, 0.04, 0.85, 0x1e293b, { pos: [-1.35, -0.24, -3.15] }),
      makeBox(1.05, 0.06, 0.36, 0xe2e8f0, { pos: [-1.35, -0.2, -3.15] }),
      makeBox(0.2, 0.48, 0.2, 0xf8fafc, { pos: [1.35, 0.0, -3.35] }),
      makeBox(0.75, 0.36, 0.75, 0xff66b2, {
        pos: [1.35, 0.36, -3.35],
        emissive: true,
        emissiveColor: 0xff4da6,
        emissiveIntensity: 1.15,
      })
    );

    // Terrarium / Vivarium on Dark Cabinet (Back-Right)
    roomGroup.add(
      makeBox(2.2, 1.5, 1.5, 0x1e293b, { pos: [3.8, -1.4, -3.55] }),
      makeBox(2.3, 0.18, 1.6, 0x8d5832, { pos: [3.8, -0.6, -3.55] }),
      makeBox(1.5, 1.05, 1.15, 0x1e293b, { pos: [3.65, 0.02, -3.6] }),
      makeBox(1.25, 0.5, 0.9, 0x22c55e, {
        pos: [3.65, -0.2, -3.6],
        emissive: true,
        emissiveColor: 0x16a34a,
        emissiveIntensity: 0.4,
      }),
      makeBox(0.18, 0.18, 0.18, 0xfacc15, {
        pos: [3.3, 0.22, -3.4],
        emissive: true,
        emissiveIntensity: 1.4,
      }),
      makeBox(0.16, 0.16, 0.16, 0xfacc15, {
        pos: [3.95, 0.1, -3.5],
        emissive: true,
        emissiveIntensity: 1.4,
      }),
      makeBox(0.55, 0.42, 0.28, 0x0f172a, { pos: [4.65, -0.32, -3.25], rot: [0, -0.35, 0] }),
      makeBox(0.46, 0.32, 0.3, 0x38bdf8, {
        pos: [4.65, -0.32, -3.24],
        rot: [0, -0.35, 0],
        emissive: true,
        emissiveIntensity: 0.85,
      })
    );

    // Turntable Nightstand & Colorful Books (Mid-Right)
    roomGroup.add(
      makeBox(1.2, 0.95, 1.0, 0x7c4c29, { pos: [2.2, -1.62, -3.65] }),
      makeBox(0.6, 0.14, 0.5, 0xf8fafc, { pos: [2.05, -1.08, -3.65] }),
      makeBox(0.28, 0.42, 0.42, 0x8b5cf6, { pos: [2.55, -0.94, -3.65] })
    );

    // Foreground-Left Maker Workbench Table (Green Cutting Mat + Desk Lamp + Prototype Rig)
    roomGroup.add(
      makeBox(4.2, 0.22, 2.8, 0x8d5832, { pos: [-3.1, -0.55, 1.85], roughness: 0.45 }),
      makeBox(0.25, 1.55, 0.25, 0x5c361c, { pos: [-4.95, -1.4, 0.65] }),
      makeBox(0.25, 1.55, 0.25, 0x5c361c, { pos: [-1.25, -1.4, 0.65] }),
      makeBox(0.25, 1.55, 0.25, 0x5c361c, { pos: [-4.95, -1.4, 3.05] }),
      makeBox(0.25, 1.55, 0.25, 0x5c361c, { pos: [-1.25, -1.4, 3.05] }),
      makeBox(2.4, 0.04, 1.75, 0xffffff, {
        pos: [-3.1, -0.42, 1.85],
        map: makeCuttingMatTexture(),
      }),
      makeBox(0.75, 0.35, 0.55, 0xf97316, { pos: [-3.05, -0.22, 1.85] }),
      makeBox(0.25, 0.12, 0.25, 0x38bdf8, {
        pos: [-2.45, -0.34, 1.65],
        emissive: true,
        emissiveIntensity: 1.0,
      }),
      makeBox(0.42, 0.08, 0.42, 0x0f172a, { pos: [-3.6, -0.4, 1.1] }),
      makeBox(0.1, 1.15, 0.1, 0x1e293b, { pos: [-3.5, 0.15, 1.2], rot: [0.25, 0, -0.2] }),
      makeBox(0.38, 0.24, 0.38, 0x0f172a, { pos: [-3.25, 0.68, 1.45], rot: [0.4, 0, 0] })
    );

    // Warm Incandescent Bulb + Pool of Light inside the Articulated Workbench Lamp
    const lampBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffd27d,
        emissive: 0xffa940,
        emissiveIntensity: 3.2,
        roughness: 0.2,
      })
    );
    lampBulb.position.set(-3.22, 0.54, 1.48);
    const lampHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    lampHalo.position.copy(lampBulb.position);
    const workbenchBulbLight = new THREE.PointLight(0xffaa44, 32, 14, 1.35);
    workbenchBulbLight.position.set(-3.18, 0.48, 1.52);
    roomGroup.add(lampBulb, lampHalo, workbenchBulbLight);

    // Small Cozy Incandescent Edison Lamp on the Table Corner
    roomGroup.add(
      makeBox(0.36, 0.08, 0.36, 0x5c361c, { pos: [-1.62, -0.4, 2.55] }),
      makeBox(0.24, 0.06, 0.24, 0xd97706, { pos: [-1.62, -0.33, 2.55], metalness: 0.6, roughness: 0.3 })
    );
    const edisonBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffe0a3,
        emissive: 0xff9f2e,
        emissiveIntensity: 3.4,
        roughness: 0.15,
      })
    );
    edisonBulb.position.set(-1.62, -0.14, 2.55);
    const edisonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    edisonHalo.position.copy(edisonBulb.position);
    const tableIncandescentLight = new THREE.PointLight(0xff9e3d, 28, 13, 1.35);
    tableIncandescentLight.position.set(-1.62, 0.04, 2.55);
    roomGroup.add(edisonBulb, edisonHalo, tableIncandescentLight);

    // Classic Blocky Roblox Avatar sitting at the Back Coding Desk
    const avatar = new THREE.Group();
    avatar.position.set(-1.35, -0.98, -2.1);

    avatar.add(
      makeBox(1.15, 0.2, 1.15, 0x1e293b, { pos: [0, -0.35, 0] }),
      makeBox(1.1, 1.35, 0.2, 0x1e293b, { pos: [0, 0.42, 0.5] }),
      makeBox(0.18, 0.75, 0.18, 0x0f172a, { pos: [0, -0.82, 0] })
    );

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128;
    faceCanvas.height = 128;
    const fctx = faceCanvas.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#f5cd30';
      fctx.fillRect(0, 0, 128, 128);
      fctx.fillStyle = '#111827';
      fctx.beginPath();
      fctx.arc(44, 52, 8, 0, Math.PI * 2);
      fctx.fill();
      fctx.beginPath();
      fctx.arc(84, 52, 8, 0, Math.PI * 2);
      fctx.fill();
      fctx.lineWidth = 6;
      fctx.lineCap = 'round';
      fctx.beginPath();
      fctx.arc(64, 68, 22, 0.2 * Math.PI, 0.8 * Math.PI);
      fctx.stroke();
    }
    const faceTex = trackTex(new THREE.CanvasTexture(faceCanvas));

    avatar.add(
      makeBox(0.88, 0.88, 0.88, 0xf5cd30, { pos: [0, 1.32, -0.05], map: faceTex }),
      makeBox(1.05, 1.1, 0.56, 0x0d69ac, { pos: [0, 0.32, -0.05] }),
      makeBox(0.44, 0.42, 0.95, 0x4b974b, { pos: [-0.26, -0.16, -0.42] }),
      makeBox(0.44, 0.42, 0.95, 0x4b974b, { pos: [0.26, -0.16, -0.42] })
    );
    const leftArm = makeBox(0.38, 0.38, 1.0, 0xf5cd30, { pos: [-0.75, 0.52, -0.52] });
    const rightArm = makeBox(0.38, 0.38, 1.0, 0xf5cd30, { pos: [0.75, 0.52, -0.52] });
    avatar.add(leftArm, rightArm);
    roomGroup.add(avatar);

    // Mini Blocky AI Sub-Agent Robots
    const subAgents: Array<{ mesh: THREE.Group; baseY: number; phase: number }> = [];
    const botCoords: Array<[number, number, number]> = [
      [-3.8, 0.08, -3.1],
      [0.65, 0.08, -3.05],
      [-0.2, -1.78, 0.2],
    ];
    botCoords.forEach((p, idx) => {
      const bot = new THREE.Group();
      bot.position.set(...p);
      bot.add(
        makeBox(0.48, 0.52, 0.42, 0xe2e8f0, { pos: [0, 0, 0] }),
        makeBox(0.42, 0.36, 0.42, 0xf8fafc, { pos: [0, 0.45, 0] }),
        makeBox(0.09, 0.09, 0.06, 0x00e5ff, {
          pos: [-0.09, 0.47, 0.21],
          emissive: true,
          emissiveIntensity: 1.5,
        }),
        makeBox(0.09, 0.09, 0.06, 0x00e5ff, {
          pos: [0.09, 0.47, 0.21],
          emissive: true,
          emissiveIntensity: 1.5,
        })
      );
      roomGroup.add(bot);
      subAgents.push({ mesh: bot, baseY: p[1], phase: idx * 2.1 });
    });

    // Outer Glass-Wall Lush Blocky Foliage, Pink-Capped Mushrooms & Flowers
    const foliagePositions: Array<[number, number, number]> = [
      [-6.4, -2.0, -4.4],
      [-6.5, -2.0, -0.8],
      [-6.2, -2.0, 3.6],
      [6.4, -2.0, -3.8],
      [6.4, -2.0, 2.4],
      [0.8, -2.0, 6.0],
      [-3.2, -2.0, 5.9],
      [-4.8, -2.0, 5.8],
      [5.2, -2.0, 5.6],
    ];
    foliagePositions.forEach((fp, i) => {
      roomGroup.add(makeBox(1.15, 0.78, 1.15, i % 2 === 0 ? 0x22c55e : 0x16a34a, { pos: fp }));
      if (i % 2 === 0) {
        roomGroup.add(
          makeBox(0.22, 0.45, 0.22, 0xf8fafc, { pos: [fp[0] + 0.45, fp[1] + 0.35, fp[2] + 0.45] }),
          makeBox(0.75, 0.26, 0.75, 0xf472b6, {
            pos: [fp[0] + 0.45, fp[1] + 0.65, fp[2] + 0.45],
            emissive: true,
            emissiveColor: 0xec4899,
            emissiveIntensity: 0.45,
          })
        );
      } else {
        roomGroup.add(
          makeBox(0.24, 0.24, 0.24, 0xfef08a, {
            pos: [fp[0] - 0.3, fp[1] + 0.48, fp[2] + 0.3],
            emissive: true,
            emissiveIntensity: 0.6,
          }),
          makeBox(0.22, 0.22, 0.22, 0xf43f5e, {
            pos: [fp[0] + 0.35, fp[1] + 0.46, fp[2] - 0.2],
            emissive: true,
            emissiveIntensity: 0.6,
          })
        );
      }
    });

    // Translucent Glowing Glass Sphere Encasing the Room
    const glassSphere = new THREE.Mesh(
      new THREE.SphereGeometry(9.6, 48, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0x8be9fd,
        transparent: true,
        opacity: 0.065,
        roughness: 0.08,
        metalness: 0.1,
        side: THREE.FrontSide,
        depthWrite: false,
      })
    );
    scene.add(glassSphere);

    const coreWire = new THREE.Mesh(
      new THREE.SphereGeometry(9.65, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      })
    );
    scene.add(coreWire);

    // =========================================================
    // 2. OUTER ARCHITECTURE: THE NODE-BASED KNOWLEDGE GLOBE
    // =========================================================
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const GLOBE_RADIUS = 22;
    const MESH_NODE_COUNT = 340;
    const palette = [0x00e5ff, 0x3b82f6, 0x8b5cf6, 0xf472b6];

    const meshPoints: THREE.Vector3[] = [];
    const nodeColors: number[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < MESH_NODE_COUNT; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / MESH_NODE_COUNT);
      const r = GLOBE_RADIUS + Math.sin(i * 1.7) * 0.8;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      meshPoints.push(new THREE.Vector3(x, y, z));

      const col = new THREE.Color(palette[i % palette.length]);
      nodeColors.push(col.r, col.g, col.b);
    }

    const pointsGeo = new THREE.BufferGeometry().setFromPoints(meshPoints);
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));
    const pointsMat = new THREE.PointsMaterial({
      size: 0.72,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    globeGroup.add(new THREE.Points(pointsGeo, pointsMat));

    const lineVerts: number[] = [];
    const lineCols: number[] = [];
    for (let i = 0; i < MESH_NODE_COUNT; i++) {
      for (let j = i + 1; j < MESH_NODE_COUNT; j++) {
        const dist = meshPoints[i].distanceTo(meshPoints[j]);
        if (dist < 4.9) {
          lineVerts.push(meshPoints[i].x, meshPoints[i].y, meshPoints[i].z);
          lineVerts.push(meshPoints[j].x, meshPoints[j].y, meshPoints[j].z);
          const c1 = new THREE.Color(palette[i % palette.length]);
          const c2 = new THREE.Color(palette[j % palette.length]);
          lineCols.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineCols, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    });
    const synapticLines = new THREE.LineSegments(lineGeo, lineMat);
    globeGroup.add(synapticLines);

    const interactiveMeshes: THREE.Mesh[] = [];
    const majorGalaxies: Array<{
      halo: THREE.Mesh;
      ring1: THREE.Mesh;
      ring2: THREE.Mesh;
      spiralPts: THREE.Points;
      phase: number;
    }> = [];
    const calloutItems: Array<{
      data: KnowledgeNodeData;
      orb: THREE.Mesh;
      el: HTMLDivElement;
      lineEl: SVGLineElement;
      offset: number;
    }> = [];

    while (calloutSvg.firstChild) {
      calloutSvg.removeChild(calloutSvg.firstChild);
    }
    calloutsLayer.querySelectorAll('.kg-callout-label').forEach((n) => n.remove());

    function createNodeGalaxy(colorHex: number, phase: number) {
      const gGroup = new THREE.Group();

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(1.65, 16, 16),
        new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      gGroup.add(halo);

      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.045, 8, 48),
        new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
        })
      );
      ring1.rotation.x = Math.PI / 2.6;
      ring1.rotation.y = 0.4;

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.7, 0.03, 8, 48),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
        })
      );
      ring2.rotation.x = -Math.PI / 3;
      ring2.rotation.y = -0.5;
      gGroup.add(ring1, ring2);

      const starCount = 72;
      const gVerts: number[] = [];
      const gCols: number[] = [];
      const baseCol = new THREE.Color(colorHex);
      const whiteCol = new THREE.Color(0xffffff);
      for (let i = 0; i < starCount; i++) {
        const arm = i % 3;
        const dist = 1.1 + (i / starCount) * 2.5;
        const angle = dist * 1.45 + (arm * Math.PI * 2) / 3;
        const spreadY = (Math.random() - 0.5) * 0.35;
        gVerts.push(Math.cos(angle) * dist, spreadY, Math.sin(angle) * dist);
        const mixed = baseCol.clone().lerp(whiteCol, i % 5 === 0 ? 0.65 : 0.15);
        gCols.push(mixed.r, mixed.g, mixed.b);
      }
      const spiralGeo = new THREE.BufferGeometry();
      spiralGeo.setAttribute('position', new THREE.Float32BufferAttribute(gVerts, 3));
      spiralGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCols, 3));
      const spiralPts = new THREE.Points(
        spiralGeo,
        new THREE.PointsMaterial({
          size: 0.28,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      spiralPts.rotation.x = 0.45;
      gGroup.add(spiralPts);

      majorGalaxies.push({ halo, ring1, ring2, spiralPts, phase });
      return gGroup;
    }

    interface CamAnimState {
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      startTarget: THREE.Vector3;
      endTarget: THREE.Vector3;
      t: number;
    }
    let camAnim: CamAnimState | null = null;

    const focusCameraOnOrb = (orb: THREE.Mesh | undefined) => {
      if (!orb) return;
      const worldPos = new THREE.Vector3();
      orb.getWorldPosition(worldPos);
      const dir = worldPos.clone().normalize();
      camAnim = {
        startPos: camera.position.clone(),
        endPos: worldPos.clone().addScaledVector(dir, 26).add(new THREE.Vector3(0, 6, 0)),
        startTarget: controls.target.clone(),
        endTarget: worldPos.clone().multiplyScalar(0.35),
        t: 0,
      };
    };

    const selectNodeFromScene = (item: KnowledgeNodeData, orb: THREE.Mesh) => {
      setSelectedNode(item);
      setInspectorOpen(true);
      focusCameraOnOrb(orb);
    };

    focusNodeFnRef.current = (nodeId: string) => {
      const targetOrb = interactiveMeshes.find(
        (m) => (m.userData.nodeData as KnowledgeNodeData)?.id === nodeId
      );
      focusCameraOnOrb(targetOrb);
    };

    KNOWLEDGE_NODES.forEach((item, idx) => {
      const geo = new THREE.OctahedronGeometry(item.callout ? 1.15 : 0.65, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: item.color,
        emissiveIntensity: item.callout ? 1.7 : 1.3,
        roughness: 0.2,
      });
      const orb = new THREE.Mesh(geo, mat);
      orb.position.set(...item.pos);
      orb.userData = { nodeData: item };
      globeGroup.add(orb);
      interactiveMeshes.push(orb);

      if (item.callout) {
        orb.add(createNodeGalaxy(item.color, idx * 1.3));
      }

      const streamGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...item.pos).multiplyScalar(0.45),
        new THREE.Vector3(...item.pos),
      ]);
      const streamMat = new THREE.LineBasicMaterial({
        color: item.color,
        transparent: true,
        opacity: item.callout ? 0.38 : 0.15,
        blending: THREE.AdditiveBlending,
      });
      globeGroup.add(new THREE.Line(streamGeo, streamMat));

      if (item.callout) {
        const hex = '#' + item.color.toString(16).padStart(6, '0');
        const el = document.createElement('div');
        el.className = 'kg-callout-label';
        Object.assign(el.style, {
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 11px',
          borderRadius: '8px',
          background: 'rgba(10, 15, 29, 0.78)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 229, 255, 0.32)',
          color: '#F1F5F9',
          fontFamily: "'Silkscreen', 'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.5)',
          transition: 'border-color 0.2s, background 0.2s',
        });

        const dot = document.createElement('span');
        Object.assign(dot.style, {
          width: '7px',
          height: '7px',
          borderRadius: '2px',
          flexShrink: '0',
          background: hex,
          boxShadow: `0 0 8px ${hex}`,
        });
        el.appendChild(dot);
        el.appendChild(document.createTextNode(item.title));

        el.addEventListener('mouseenter', () => {
          el.style.borderColor = '#00E5FF';
          el.style.background = 'rgba(16, 26, 52, 0.92)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.borderColor = 'rgba(0, 229, 255, 0.32)';
          el.style.background = 'rgba(10, 15, 29, 0.78)';
        });
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          selectNodeFromScene(item, orb);
        });
        calloutsLayer.appendChild(el);

        const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineEl.setAttribute('stroke', hex);
        lineEl.setAttribute('stroke-width', '1.2');
        lineEl.setAttribute('stroke-opacity', '0.6');
        calloutSvg.appendChild(lineEl);

        calloutItems.push({ data: item, orb, el, lineEl, offset: idx });
      }
    });

    interactiveMeshesRef.current = interactiveMeshes;

    // Orbiting Data Ring & Starfield
    const orbitRing = new THREE.Mesh(
      new THREE.RingGeometry(27.5, 27.75, 96),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22,
      })
    );
    orbitRing.rotation.x = Math.PI / 2.4;
    orbitRing.rotation.y = 0.25;
    scene.add(orbitRing);

    const starVerts: number[] = [];
    for (let i = 0; i < 600; i++) {
      starVerts.push(
        (Math.random() - 0.5) * 260,
        (Math.random() - 0.5) * 260,
        (Math.random() - 0.5) * 260
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0x94a3b8,
          size: 0.45,
          transparent: true,
          opacity: 0.55,
        })
      )
    );

    setSceneModeFnRef.current = (nextMode: GlobeMode) => {
      modeRef.current = nextMode;
      const p = CAMERA_PRESETS[nextMode];
      camAnim = {
        startPos: camera.position.clone(),
        endPos: new THREE.Vector3(...p.pos),
        startTarget: controls.target.clone(),
        endTarget: new THREE.Vector3(...p.target),
        t: 0,
      };
      calloutsLayer.style.opacity = nextMode === 'mindmap' || nextMode === 'connect' ? '1' : '0';
      synapticLines.material.opacity = nextMode === 'connect' ? 0.48 : 0.24;
    };

    // Raycasting for clicking 3D nodes
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = 'grabbing';
    };

    const handlePointerUp = (e: PointerEvent) => {
      renderer.domElement.style.cursor = 'grab';
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes);
      if (hits.length > 0) {
        const hitOrb = hits[0].object as THREE.Mesh;
        const nodeData = hitOrb.userData.nodeData as KnowledgeNodeData;
        if (nodeData) {
          selectNodeFromScene(nodeData, hitOrb);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const updateSize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    const clock = new THREE.Clock();
    const targetScaleVec = new THREE.Vector3();
    let animId = 0;

    const updateCallouts = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;

      calloutItems.forEach((c) => {
        const worldPos = new THREE.Vector3();
        c.orb.getWorldPosition(worldPos);
        const proj = worldPos.clone().project(camera);

        if (proj.z > 1) {
          c.el.style.display = 'none';
          c.lineEl.style.display = 'none';
          return;
        }
        c.el.style.display = 'flex';
        c.lineEl.style.display = 'block';

        const sx = (proj.x * 0.5 + 0.5) * w;
        const sy = (-proj.y * 0.5 + 0.5) * h;

        const side = sx >= w / 2 ? 1 : -1;
        const lx = Math.max(105, Math.min(w - 105, sx + side * 86));
        const ly = Math.max(76, Math.min(h - 68, sy + (c.offset % 2 === 0 ? -18 : 18)));

        c.el.style.left = `${lx}px`;
        c.el.style.top = `${ly}px`;

        c.lineEl.setAttribute('x1', String(sx));
        c.lineEl.setAttribute('y1', String(sy));
        c.lineEl.setAttribute('x2', String(lx));
        c.lineEl.setAttribute('y2', String(ly));
      });
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      if (modeRef.current !== 'room') {
        globeGroup.rotation.y += dt * 0.045;
      }
      orbitRing.rotation.z -= dt * 0.08;

      majorGalaxies.forEach((g) => {
        g.spiralPts.rotation.y += dt * 0.9;
        g.ring1.rotation.z += dt * 0.7;
        g.ring2.rotation.z -= dt * 0.55;
        const pulse = 1 + Math.sin(t * 2.4 + g.phase) * 0.14;
        g.halo.scale.set(pulse, pulse, pulse);
      });

      subAgents.forEach((b) => {
        b.mesh.position.y = b.baseY + Math.sin(t * 2.6 + b.phase) * 0.12;
        b.mesh.rotation.y = Math.sin(t * 1.2 + b.phase) * 0.25;
      });
      leftArm.rotation.x = Math.sin(t * 9) * 0.08;
      rightArm.rotation.x = Math.cos(t * 9) * 0.08;

      interactiveMeshes.forEach((m) => {
        const nodeId = (m.userData.nodeData as KnowledgeNodeData)?.id;
        const isSelected = nodeId && nodeId === selectedIdRef.current;
        const targetScale = isSelected ? 1.5 + Math.sin(t * 4) * 0.15 : 1.0;
        targetScaleVec.set(targetScale, targetScale, targetScale);
        m.scale.lerp(targetScaleVec, 0.12);
      });

      if (camAnim) {
        camAnim.t = Math.min(camAnim.t + dt * 1.8, 1);
        const ease = 1 - Math.pow(1 - camAnim.t, 3);
        camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
        controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
        if (camAnim.t >= 1) camAnim = null;
      }

      controls.update();
      updateCallouts();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      interactiveMeshesRef.current = [];
      createdTextures.forEach((tex) => tex.dispose());

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      calloutItems.forEach((c) => {
        c.el.remove();
        c.lineEl.remove();
      });
    };
  }, []);

  const handleModeChange = (nextMode: GlobeMode) => {
    setMode(nextMode);
    setSceneModeFnRef.current?.(nextMode);
  };

  const handleSelectNode = (item: KnowledgeNodeData, focusCamera = true) => {
    setSelectedNode(item);
    setInspectorOpen(true);
    if (focusCamera) {
      focusNodeFnRef.current?.(item.id);
    }
  };

  const handleTabClick = (view: PanelTabView) => {
    setPanelTab(view);
    if (view === 'room') {
      handleModeChange('room');
    } else if (view === 'cluster') {
      handleModeChange('island');
      if (selectedNode) focusNodeFnRef.current?.(selectedNode.id);
    } else {
      handleModeChange('mindmap');
    }
  };

  const clusterPeers = useMemo(() => {
    if (!selectedNode) return [];
    const peers = KNOWLEDGE_NODES.filter((n) => n.cat === selectedNode.cat);
    return peers.length >= 2
      ? peers
      : [selectedNode, ...KNOWLEDGE_NODES.filter((n) => n.id !== selectedNode.id).slice(0, 3)];
  }, [selectedNode]);

  const aiBridges = useMemo(() => {
    if (!selectedNode) return [];
    return KNOWLEDGE_NODES.filter((n) => n.cat !== selectedNode.cat).slice(0, 3);
  }, [selectedNode]);

  const sourceUri = selectedNode
    ? `roblox://workspace/${selectedNode.cat.replace(/\s+/g, '')}/${selectedNode.title.replace(/\s+/g, '')}`
    : '';

  const handleCopyUri = () => {
    if (!sourceUri) return;
    navigator.clipboard?.writeText(sourceUri).catch(() => {});
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 1400);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #10172b 0%, #080A12 72%)',
      }}
    >
      {/* Top Spatial HUD Bar */}
      <div className="absolute top-3.5 left-4 right-4 min-h-[48px] flex flex-wrap items-center justify-between gap-3 z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-[rgba(13,18,34,0.72)] backdrop-blur-md border border-[rgba(148,163,184,0.16)] rounded-xl px-3 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <span
            className="w-[9px] h-[9px] rounded-full bg-[#00E5FF] shrink-0"
            style={{ boxShadow: '0 0 10px #00E5FF' }}
          />
          <div className="text-[12.5px] font-semibold text-[#F1F5F9] tracking-[0.01em] whitespace-nowrap">
            Second brain <span className="text-[#94A3B8] font-medium">• 19 nodes</span>
          </div>
        </div>

        {/* Search Bar + Filter Popover */}
        <div ref={searchWrapRef} className="flex-1 min-w-[220px] max-w-[400px] relative pointer-events-auto">
          <div className="w-full flex items-center gap-2 bg-[rgba(13,18,34,0.78)] backdrop-blur-md border border-[rgba(148,163,184,0.18)] rounded-xl px-3.5 py-[7px] transition-all focus-within:border-[rgba(0,229,255,0.55)] focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.12)]">
            <svg
              className="w-3.5 h-3.5 text-[#64748B] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Search Knowledge Graph (19 nodes)..."
              autoComplete="off"
              className="w-full bg-transparent border-none outline-none text-[#F8FAFC] placeholder-[#64748B] text-[12.5px]"
            />
          </div>

          {searchOpen && (
            <div className="absolute top-[calc(100%+8px)] -left-6 -right-6 bg-[rgba(11,14,24,0.96)] backdrop-blur-xl border border-[rgba(148,163,184,0.18)] rounded-[14px] p-3.5 flex flex-col gap-3 shadow-[0_24px_56px_rgba(0,0,0,0.78)] z-30">
              {/* Provider Filter */}
              <div>
                <div className="text-[10px] font-mono-code tracking-[0.1em] text-[#94A3B8] uppercase mb-1">
                  PROVIDER FILTER
                </div>
                <div className="flex flex-col gap-1">
                  {PROVIDERS.map((p) => (
                    <label
                      key={p.label}
                      className="flex items-center justify-between px-2.5 py-[7px] rounded-lg cursor-pointer hover:bg-white/5 text-[12.5px] font-medium text-[#E2E8F0] transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: p.color }}
                        />
                        {p.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={enabledProviders[p.label]}
                        onChange={(e) =>
                          setEnabledProviders((prev) => ({
                            ...prev,
                            [p.label]: e.target.checked,
                          }))
                        }
                        className="w-[15px] h-[15px] accent-[#60A5FA] cursor-pointer rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[rgba(148,163,184,0.14)] my-0.5" />

              {/* Checkpoints Only */}
              <label className="flex items-center justify-between px-1.5 py-1 cursor-pointer text-[12.5px] font-medium text-[#E2E8F0]">
                <span className="flex items-center gap-2.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v18" />
                    <path d="M5 7h11l3 3-3 3H5z" />
                  </svg>
                  Show checkpoints only
                </span>
                <input
                  type="checkbox"
                  checked={checkpointOnly}
                  onChange={(e) => setCheckpointOnly(e.target.checked)}
                  className="w-[15px] h-[15px] accent-[#60A5FA] cursor-pointer rounded"
                />
              </label>

              <div className="h-px bg-[rgba(148,163,184,0.14)] my-0.5" />

              {/* Time Window */}
              <div>
                <div className="text-[10px] font-mono-code tracking-[0.1em] text-[#94A3B8] uppercase mb-1">
                  TIME WINDOW
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_WINDOWS.map((tw) => {
                    const active = maxHours === tw.hours;
                    return (
                      <button
                        key={tw.label}
                        type="button"
                        onClick={() => setMaxHours(tw.hours)}
                        className={`text-[11px] font-bold py-[7px] rounded-lg border font-mono-code cursor-pointer transition-all ${
                          active
                            ? 'bg-[#7C3AED] border-[#8B5CF6] text-white shadow-[0_0_14px_rgba(124,58,237,0.45)]'
                            : 'bg-[rgba(15,23,42,0.8)] border-[rgba(148,163,184,0.18)] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[rgba(148,163,184,0.4)]'
                        }`}
                      >
                        {tw.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-[rgba(148,163,184,0.14)] my-0.5" />

              <div className="flex justify-between items-center text-[11px] font-semibold text-[#94A3B8] px-0.5">
                <span>
                  Matching Nodes • <strong className="text-[#00E5FF]">{filteredMatches.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-[#64748B] hover:text-[#CBD5E1] cursor-pointer bg-transparent border-none text-[11px]"
                >
                  Esc to close
                </button>
              </div>

              <div className="max-h-[190px] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                {filteredMatches.length === 0 ? (
                  <div className="p-3 text-center text-[#64748B] text-[11.5px]">
                    No matching nodes for current filters
                  </div>
                ) : (
                  filteredMatches.map((m) => {
                    const hex = '#' + m.color.toString(16).padStart(6, '0');
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          handleSelectNode(m, true);
                          setSearchOpen(false);
                        }}
                        className="flex items-center justify-between gap-2.5 px-2.5 py-[7px] rounded-[9px] bg-[rgba(15,23,42,0.72)] border border-[rgba(148,163,184,0.12)] hover:bg-[rgba(0,229,255,0.12)] hover:border-[rgba(0,229,255,0.45)] cursor-pointer transition-all text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-[3px] shrink-0"
                            style={{ background: hex, boxShadow: `0 0 8px ${hex}` }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#F8FAFC] truncate">
                              {m.title}
                            </div>
                            <div className="text-[10.5px] text-[#94A3B8] truncate">
                              {m.provider} • {m.cat}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono-code text-[#00E5FF] bg-[rgba(0,229,255,0.12)] px-[7px] py-[3px] rounded-md whitespace-nowrap shrink-0">
                          Focus 3D →
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mode Toggles */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[rgba(13,18,34,0.72)] backdrop-blur-md border border-[rgba(148,163,184,0.16)] rounded-xl p-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          {(
            [
              { id: 'room', label: 'Room' },
              { id: 'island', label: 'Island' },
              { id: 'mindmap', label: 'Mind Map' },
              { id: 'connect', label: 'Connect' },
            ] as const
          ).map((btn) => {
            const active = mode === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleModeChange(btn.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  active
                    ? 'text-white border border-[rgba(0,229,255,0.45)] shadow-[0_0_14px_rgba(0,229,255,0.18)]'
                    : 'bg-transparent border border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
                }`}
                style={
                  active
                    ? {
                        background:
                          'linear-gradient(135deg, rgba(0, 229, 255, 0.22), rgba(139, 92, 246, 0.25))',
                      }
                    : undefined
                }
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2D Projected Callout Labels */}
      <div
        ref={calloutsLayerRef}
        className="absolute inset-0 pointer-events-none z-10 overflow-hidden transition-opacity duration-300"
      >
        <svg ref={calloutSvgRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Right Node Cluster Detail Panel */}
      <aside
        className={`absolute top-[72px] right-4 bottom-[54px] w-[344px] max-w-[calc(100%-2rem)] bg-[rgba(11,16,30,0.9)] backdrop-blur-xl border border-[rgba(148,163,184,0.2)] rounded-2xl p-[15px] z-25 flex flex-col gap-[11px] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.65)] transition-all duration-300 ${
          inspectorOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-[370px] opacity-0 pointer-events-none'
        }`}
      >
        {selectedNode && (
          <>
            <div className="flex justify-between items-center gap-2">
              <div className="text-[11px] font-semibold text-[#94A3B8] tracking-[0.01em]">
                {selectedNode.cat} • Node Cluster
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectorOpen(false);
                  setSelectedNode(null);
                }}
                title="Close"
                className="bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/15 w-[26px] h-[26px] rounded-[7px] cursor-pointer grid place-items-center text-[13px] shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-[rgba(15,23,42,0.8)] p-1 rounded-[10px] border border-[rgba(148,163,184,0.14)]">
              {(
                [
                  { id: 'room', label: 'In Room' },
                  { id: 'cluster', label: 'Cluster' },
                  { id: 'mindmap', label: 'Full Map' },
                ] as const
              ).map((tab) => {
                const active = panelTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`border-none text-[11px] font-semibold py-1.5 px-1 rounded-[7px] cursor-pointer transition-all ${
                      active
                        ? 'bg-[#F8FAFC] text-[#0F172A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                        : 'bg-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="bg-[rgba(245,158,11,0.16)] text-[#FBBF24] border border-[rgba(245,158,11,0.32)] px-2 py-[3px] rounded-md font-semibold text-[10.5px]">
                {selectedNode.provider}
              </span>
              <span className="text-[#94A3B8] text-[10.5px] font-medium">
                {selectedNode.checkpoint ? 'Checkpoint Node' : 'Synced Node'}
              </span>
            </div>

            <div className="text-[14.5px] font-bold text-[#F8FAFC] leading-snug">
              {selectedNode.title}
            </div>
            <div className="text-xs leading-relaxed text-[#94A3B8]">{selectedNode.desc}</div>

            <div className="bg-[rgba(7,10,20,0.85)] border border-[rgba(148,163,184,0.16)] rounded-[10px] px-3 py-2.5 flex flex-col gap-[7px]">
              <div className="flex justify-between items-center text-[9.5px] font-mono-code tracking-[0.06em] text-[#64748B]">
                <span>SYNCED SOURCE EXCERPT / LUAU</span>
                <button
                  type="button"
                  onClick={() => focusNodeFnRef.current?.(selectedNode.id)}
                  className="text-[#00E5FF] text-[10px] cursor-pointer bg-transparent border-none font-mono-code"
                >
                  Focus 3D →
                </button>
              </div>
              <pre className="font-mono-code text-[10.5px] leading-[1.48] text-[#7DD3FC] overflow-x-auto whitespace-pre bg-[rgba(15,23,42,0.6)] p-2 rounded-[7px] border border-[rgba(56,189,248,0.14)]">
                {selectedNode.code}
              </pre>
            </div>

            <div className="flex justify-between items-center gap-2 bg-[rgba(15,23,42,0.72)] border border-[rgba(148,163,184,0.15)] rounded-[10px] px-2.5 py-2">
              <div className="min-w-0">
                <div className="text-[9.5px] text-[#64748B] mb-0.5">Connected Source Link</div>
                <div className="font-mono-code text-[10px] text-[#94A3B8] truncate">
                  {sourceUri}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyUri}
                className="bg-white/10 border border-white/15 hover:bg-[rgba(0,229,255,0.2)] hover:border-[#00E5FF] text-[#F8FAFC] text-[10.5px] font-semibold px-[9px] py-1 rounded-md cursor-pointer whitespace-nowrap"
              >
                {copiedUri ? 'Copied!' : 'Copy URI'}
              </button>
            </div>

            <div className="text-[10.5px] text-[#64748B] font-semibold tracking-[0.03em]">
              Nodes in {selectedNode.cat} ({clusterPeers.length})
            </div>
            <div className="flex flex-col gap-[5px]">
              {clusterPeers.map((peer) => {
                const isActive = peer.id === selectedNode.id;
                return (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => handleSelectNode(peer, true)}
                    className={`text-left text-[11.5px] font-semibold px-2.5 py-[7px] rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#F8FAFC] text-[#0F172A] border-[#F8FAFC]'
                        : 'bg-[rgba(15,23,42,0.72)] border-[rgba(148,163,184,0.14)] text-[#CBD5E1] hover:border-[rgba(0,229,255,0.45)] hover:text-white'
                    }`}
                  >
                    {peer.title}
                  </button>
                );
              })}
            </div>

            <div className="text-[10.5px] text-[#64748B] font-semibold tracking-[0.03em]">
              AI-Discovered &amp; Explicit Paths
            </div>
            <div className="flex flex-col gap-1.5">
              {aiBridges.map((bridge, idx) => (
                <button
                  key={bridge.id}
                  type="button"
                  onClick={() => handleSelectNode(bridge, true)}
                  className="text-left bg-[rgba(15,23,42,0.65)] border border-[rgba(139,92,246,0.24)] hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.16)] rounded-[9px] px-2.5 py-2 cursor-pointer transition-all"
                >
                  <div className="text-[9.5px] text-[#A78BFA] font-mono-code mb-0.5">
                    {idx === 0 ? 'AI-Discovered Bridge' : 'Explicit Synaptic Link'} • {bridge.cat}
                  </div>
                  <div className="text-[11.5px] font-semibold text-[#E2E8F0]">{bridge.title}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Bottom Status & Legend */}
      <div className="absolute bottom-3.5 left-4 right-4 flex flex-wrap justify-between items-center gap-2 pointer-events-none z-15">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3.5 bg-[rgba(13,18,34,0.72)] backdrop-blur-md border border-[rgba(148,163,184,0.16)] rounded-xl px-3 py-1.5 text-[11px] text-[#94A3B8] shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <span className="flex items-center gap-1.5">
            <i
              className="w-2 h-2 rounded-[2px] inline-block"
              style={{ background: '#00E5FF', boxShadow: '0 0 6px #00E5FF' }}
            />
            Knowledge Graph
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-[2px] inline-block bg-[#3B82F6]" />
            Avatar Scripts
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-[2px] inline-block bg-[#8B5CF6]" />
            World Assets
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-[2px] inline-block bg-[#F472B6]" />
            Live Connections
          </span>
        </div>

        <div className="pointer-events-auto hidden md:flex items-center bg-[rgba(13,18,34,0.72)] backdrop-blur-md border border-[rgba(148,163,184,0.16)] rounded-xl px-3 py-1.5 text-[11px] text-[#94A3B8] shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <span>Drag to orbit · Scroll to zoom · Click any glowing node to inspect</span>
        </div>
      </div>
    </div>
  );
};
