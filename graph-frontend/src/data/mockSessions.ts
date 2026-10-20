import { Session, MemoryNode } from '../types';

// Helper to generate dense colonies for stress testing and 100+ node visualization
function generateLargeAutonomousSession(): Session {
  const nodes: MemoryNode[] = [];
  let idCounter = 0;

  // Colony 1: Distributed Root Architecture & Gateway Ingestion (25 nodes)
  const cp1Id = 'cp-colony-1';
  nodes.push({
    node_id: 'node-0',
    prev_id: null,
    type: 'turn',
    content: 'Autonomous Gateway initialized: Ingesting high-concurrency trace logs across 12 distributed regions for multi-model arbitration.',
    model_used: 'gpt',
    status_at_this_point: 'done',
    timestamp: '2026-09-14T14:00:00Z',
  });
  idCounter++;

  let lastId = 'node-0';
  for (let i = 1; i <= 22; i++) {
    const isDecision = i % 5 === 0;
    const model = i % 3 === 0 ? 'claude' : 'gpt';
    const currentId = `node-1-${i}`;
    nodes.push({
      node_id: currentId,
      prev_id: lastId,
      type: isDecision ? 'decision' : 'turn',
      content: isDecision
        ? `Gateway Decision ${i}: Dynamic handoff between ${model.toUpperCase()} based on context perplexity threshold (${(0.72 + i * 0.01).toFixed(2)}).`
        : `Turn ${i}: Analyzing streaming buffer telemetry across ingress node ${i % 4}. Latency window verified at 2.4ms.`,
      model_used: model,
      status_at_this_point: 'done',
      timestamp: new Date(Date.parse('2026-09-14T14:00:00Z') + i * 90000).toISOString(),
      ...(isDecision ? { references: [`node-1-${Math.max(1, i - 3)}`, lastId] } : {}),
    });
    lastId = currentId;
    idCounter++;
  }

  // Checkpoint 1 (Cluster Center 1)
  nodes.push({
    node_id: cp1Id,
    prev_id: lastId,
    type: 'checkpoint',
    content: 'Colony Checkpoint 1 [Architecture Locked]: Consolidated 23 initial ingestion turns into immutable snapshot. Memory token footprint compressed by 78.4%.',
    model_used: 'claude',
    status_at_this_point: 'done',
    timestamp: '2026-09-14T14:35:00Z',
  });
  lastId = cp1Id;

  // Colony 2: Parallel Consensus Branching & Failure Mitigation (30 nodes with forks)
  const cp2Id = 'cp-colony-2';
  const forkRoot = 'node-2-fork';
  nodes.push({
    node_id: forkRoot,
    prev_id: lastId,
    type: 'decision',
    content: 'Gateway Fork Point: Discovered replica heartbeat timeout under 60k req/sec. Splitting memory state into two parallel mitigation branches (Raft Quorum vs Paxos Gossip).',
    model_used: 'gpt',
    status_at_this_point: 'done',
    timestamp: '2026-09-14T14:40:00Z',
    references: [cp1Id],
  });

  // Branch A (Raft Quorum via Claude - 14 nodes)
  let branchALast = forkRoot;
  for (let a = 1; a <= 13; a++) {
    const isDec = a === 5 || a === 10;
    const curA = `node-2a-${a}`;
    nodes.push({
      node_id: curA,
      prev_id: branchALast,
      type: isDec ? 'decision' : 'turn',
      content: isDec
        ? `Branch A Decision ${a}: Adjusting Raft election timeout range from 150ms-300ms to 50ms-100ms with Claude optimizer.`
        : `Branch A [Claude]: Simulated follower heartbeat failure on Node ${a}. Evaluating leader transition round ${a}.`,
      model_used: 'claude',
      status_at_this_point: a === 13 ? 'done' : 'done',
      timestamp: new Date(Date.parse('2026-09-14T14:42:00Z') + a * 60000).toISOString(),
      ...(isDec ? { references: [forkRoot] } : {}),
    });
    branchALast = curA;
  }

  // Branch B (Paxos Gossip via GPT - 14 nodes)
  let branchBLast = forkRoot;
  for (let b = 1; b <= 13; b++) {
    const isDec = b === 6 || b === 11;
    const curB = `node-2b-${b}`;
    nodes.push({
      node_id: curB,
      prev_id: branchBLast,
      type: isDec ? 'decision' : 'turn',
      content: isDec
        ? `Branch B Decision ${b}: Switch gossip fanout factor k=3 with probabilistic bloom epidemic filter.`
        : `Branch B [GPT]: Benchmarked gossip convergence latency. 99.9% consistency achieved in 14.2ms.`,
      model_used: 'gpt',
      status_at_this_point: b === 13 ? 'done' : 'done',
      timestamp: new Date(Date.parse('2026-09-14T14:43:00Z') + b * 60000).toISOString(),
      ...(isDec ? { references: [forkRoot] } : {}),
    });
    branchBLast = curB;
  }

  // Checkpoint 2 (Cluster Center 2 - merges findings from Branch A and Branch B)
  nodes.push({
    node_id: cp2Id,
    prev_id: branchBLast,
    type: 'checkpoint',
    content: 'Colony Checkpoint 2 [Consensus Proven]: Raft & Paxos simulations converged. Selected optimized Raft quorum with pipelined append entries. Pruned unneeded gossip state.',
    model_used: 'claude',
    status_at_this_point: 'done',
    timestamp: '2026-09-14T15:10:00Z',
  });
  lastId = cp2Id;

  // Colony 3: Vector Sharding & Kernel IO Tuning (28 nodes)
  const cp3Id = 'cp-colony-3';
  for (let k = 1; k <= 26; k++) {
    const isDec = k % 4 === 0;
    const model = k % 2 === 0 ? 'claude' : 'gpt';
    const curK = `node-3-${k}`;
    nodes.push({
      node_id: curK,
      prev_id: lastId,
      type: isDec ? 'decision' : 'turn',
      content: isDec
        ? `Storage Decision ${k}: Reallocating hugepages (1GB pages) and pinning memory threads to NUMA node ${k % 2}.`
        : `Turn ${k} [${model.toUpperCase()}]: Benchmarked io_uring queue depth ${16 * k}. IOPS sustained at 240,000 without syscall overhead.`,
      model_used: model,
      status_at_this_point: 'done',
      timestamp: new Date(Date.parse('2026-09-14T15:15:00Z') + k * 80000).toISOString(),
      ...(isDec ? { references: [cp2Id, `node-3-${Math.max(1, k - 2)}`] } : {}),
    });
    lastId = curK;
  }

  // Checkpoint 3 (Cluster Center 3)
  nodes.push({
    node_id: cp3Id,
    prev_id: lastId,
    type: 'checkpoint',
    content: 'Colony Checkpoint 3 [Hardware & IO Standardized]: Kernel tuning validated with zero packet drops at 50Gbps. Snapshot frozen for cluster deployment engine.',
    model_used: 'gpt',
    status_at_this_point: 'done',
    timestamp: '2026-09-14T15:55:00Z',
  });
  lastId = cp3Id;

  // Colony 4: Autonomous Production Rollout & Live Verifications (26 nodes)
  const cp4Id = 'cp-colony-4';
  for (let p = 1; p <= 24; p++) {
    const isDec = p % 5 === 0;
    const model = p % 3 === 0 ? 'claude' : 'gpt';
    const curP = `node-4-${p}`;
    nodes.push({
      node_id: curP,
      prev_id: lastId,
      type: isDec ? 'decision' : 'turn',
      content: isDec
        ? `Rollout Gate ${p}: Verified zero-downtime canary rollout on cluster slice ${p}. Promoting traffic threshold.`
        : `Turn ${p} [${model.toUpperCase()}]: Emitting health checks and telemetry probes. Error rate 0.000%, latency p999 = 3.1ms.`,
      model_used: model,
      status_at_this_point: p === 24 ? 'in_progress' : 'done',
      timestamp: new Date(Date.parse('2026-09-14T16:00:00Z') + p * 75000).toISOString(),
      ...(isDec ? { references: [cp3Id] } : {}),
    });
    lastId = curP;
  }

  // Checkpoint 4 (Cluster Center 4 - Final Living Snapshot)
  nodes.push({
    node_id: cp4Id,
    prev_id: lastId,
    type: 'checkpoint',
    content: 'Colony Checkpoint 4 [Production Active]: Global gateway cluster serving live multi-model traffic. Shared memory layer maintaining continuous context across 100+ turns.',
    model_used: 'claude',
    status_at_this_point: 'done',
    timestamp: '2026-09-14T16:40:00Z',
  });

  return {
    id: 'session-deep-colony-100',
    title: 'Autonomous Global Migration (108 Memory Nodes)',
    description: 'Dense living colony graph across 4 major checkpoints, demonstrating continuous physics drift, multi-model handoffs, and dual-branching clusters.',
    updatedAt: '2026-09-14T23:50:00Z',
    status: 'active',
    nodes,
  };
}

export const MOCK_SESSIONS: Session[] = [
  generateLargeAutonomousSession(),
  {
    id: 'session-redis-failover',
    title: 'Distributed Cache Failover & Migration',
    description: 'Autonomous diagnosis of Redis cluster latency spike, branching into concurrent replication strategies with model handoffs.',
    updatedAt: '2026-09-14T21:40:00Z',
    status: 'completed',
    nodes: [
      {
        node_id: 'n0',
        prev_id: null,
        type: 'turn',
        content: 'Operator prompt: Diagnose Redis cluster read latency spikes (p99 > 320ms) under peak load and formulate an automated failover strategy without data loss.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:10:00Z',
      },
      {
        node_id: 'n1',
        prev_id: 'n0',
        type: 'turn',
        content: 'GPT analyzed cluster slow-log telemetry: Identified heavy BGSAVE fork latency, master-replica sync lag, and memory fragmentation reaching 84% on Shard 3.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:14:22Z',
      },
      {
        node_id: 'n2',
        prev_id: 'n1',
        type: 'decision',
        content: 'Gateway Decision: Hand off task from GPT to Claude 3.5 Sonnet. Reason: Deep distributed consensus evaluation required for zero-loss failover quorum protocol.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:16:05Z',
        references: ['n0', 'n1'],
      },
      {
        node_id: 'n3',
        prev_id: 'n2',
        type: 'turn',
        content: 'Claude ingested full shared memory context. Proposed dual-write replication script with live stream sentinel to eliminate fork freezes during replication cutover.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:20:45Z',
      },
      {
        node_id: 'n4',
        prev_id: 'n3',
        type: 'turn',
        content: 'Claude benchmarked simulated cutover under 20k ops/sec: Staging runner experienced replication backpressure deadlock on worker socket buffers.',
        model_used: 'claude',
        status_at_this_point: 'blocked',
        timestamp: '2026-09-14T20:25:30Z',
      },
      {
        node_id: 'n5',
        prev_id: 'n4',
        type: 'decision',
        content: 'Gateway Decision: Fork execution into two parallel branches to resolve deadlock. Branch A tests kernel socket buffer tuning; Branch B pivots to Valkey async shard mirroring.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:28:10Z',
        references: ['n2', 'n3', 'n4'],
      },
      // Branch A: TCP / Kernel Tuning (Retried by GPT)
      {
        node_id: 'n6a',
        prev_id: 'n5',
        type: 'turn',
        content: 'Branch A [GPT]: Reconfigured net.core.somaxconn = 65535, tcp_max_syn_backlog = 8192, and adjusted client-output-buffer-limit normal 0 0 0.',
        model_used: 'gpt',
        status_at_this_point: 'in_progress',
        timestamp: '2026-09-14T20:32:00Z',
      },
      {
        node_id: 'n7a',
        prev_id: 'n6a',
        type: 'turn',
        content: 'Branch A [GPT]: Stress test results: Socket dropped packets decreased by 18%, but backpressure deadlock reoccurred at 22k ops/sec. Marked path as blocked.',
        model_used: 'gpt',
        status_at_this_point: 'blocked',
        timestamp: '2026-09-14T20:37:45Z',
      },
      // Branch B: Valkey Async Mirroring (Explored by Claude)
      {
        node_id: 'n6b',
        prev_id: 'n5',
        type: 'turn',
        content: 'Branch B [Claude]: Deployed experimental Valkey 8 async dual-replica test harness with non-blocking multi-threaded I/O streams.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:33:15Z',
      },
      {
        node_id: 'n7b',
        prev_id: 'n6b',
        type: 'turn',
        content: 'Branch B [Claude]: Verification passed: Sustained 45k ops/sec with p99 latency at 1.8ms. Zero socket backpressure or data divergence detected.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:41:00Z',
      },
      {
        node_id: 'n8',
        prev_id: 'n7b',
        type: 'checkpoint',
        content: 'Memory Checkpoint: Validated Valkey 8 async mirroring as primary production path. Compressed previous 8 turns into immutable context summary; pruned Branch A telemetry to save 14,200 tokens.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:45:00Z',
      },
      {
        node_id: 'n9',
        prev_id: 'n8',
        type: 'turn',
        content: 'GPT handed back control using compressed checkpoint: Generated automated Terraform IaC module, Helm values, and Grafana alert dashboard for cluster migration.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T20:52:10Z',
      },
    ],
  },
  {
    id: 'session-auth-rewrite',
    title: 'OAuth2 PKCE & JWT Security Architecture',
    description: 'Transitioning legacy session cookies to OAuth2 PKCE tokens with multi-tenant revocation lists.',
    updatedAt: '2026-09-14T19:15:00Z',
    status: 'completed',
    nodes: [
      {
        node_id: 'auth-1',
        prev_id: null,
        type: 'turn',
        content: 'Design modern OAuth2 Authorization Code Flow with PKCE for single-page web clients and native mobile apps with distributed token revocation.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T18:00:00Z',
      },
      {
        node_id: 'auth-2',
        prev_id: 'auth-1',
        type: 'turn',
        content: 'Claude drafted PKCE cryptographic challenge verifier (S256) and token exchange endpoints with short-lived access tokens (15m).',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T18:10:00Z',
      },
      {
        node_id: 'auth-3',
        prev_id: 'auth-2',
        type: 'decision',
        content: 'Gateway Decision: Switch to GPT for high-throughput Bloom filter revocation cache implementation. Model handoff executed seamlessly.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T18:15:20Z',
        references: ['auth-1', 'auth-2'],
      },
      {
        node_id: 'auth-4',
        prev_id: 'auth-3',
        type: 'turn',
        content: 'GPT built Redis-backed Counting Bloom filter with probabilistic false positive rate < 0.001% for O(1) instantaneous JWT revocation checks.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T18:24:00Z',
      },
      {
        node_id: 'auth-5',
        prev_id: 'auth-4',
        type: 'checkpoint',
        content: 'Security Checkpoint: PKCE exchange and Bloom filter revocation contract locked and verified. Consolidated architectural specifications into shared state.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T18:30:00Z',
      },
      {
        node_id: 'auth-6',
        prev_id: 'auth-5',
        type: 'turn',
        content: 'Claude synthesized integration test harness covering token replay attacks, code verifier spoofing, and expired refresh rotation.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T18:40:00Z',
      },
    ],
  },
  {
    id: 'session-sql-optimizer',
    title: 'Analytical Query Optimizer & Vector Indexing',
    description: 'Complex query planner optimization with parallel exploration of pgvector HNSW vs IVFFlat index strategies.',
    updatedAt: '2026-09-14T17:30:00Z',
    status: 'active',
    nodes: [
      {
        node_id: 'opt-0',
        prev_id: null,
        type: 'turn',
        content: 'Operator prompt: Benchmark 1536-dim embedding queries across 5M rows in PostgreSQL. Target query latency < 12ms at 98% recall.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T16:00:00Z',
      },
      {
        node_id: 'opt-1',
        prev_id: 'opt-0',
        type: 'turn',
        content: 'GPT created baseline schema with pgvector IVFFlat index (lists = 1000). Latency benchmarked at 34ms with 91.2% recall.',
        model_used: 'gpt',
        status_at_this_point: 'blocked',
        timestamp: '2026-09-14T16:15:00Z',
      },
      {
        node_id: 'opt-2',
        prev_id: 'opt-1',
        type: 'decision',
        content: 'Gateway Decision: Split indexing investigation into two divergent branches. Branch 1 tunes IVFFlat probes; Branch 2 evaluates HNSW with halfvec compression.',
        model_used: 'gpt',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T16:20:00Z',
        references: ['opt-0', 'opt-1'],
      },
      // Branch 1
      {
        node_id: 'opt-3a',
        prev_id: 'opt-2',
        type: 'turn',
        content: 'Branch 1 [GPT]: Increased ivfflat.probes = 50. Recall improved to 95.4%, but latency escalated to 48ms.',
        model_used: 'gpt',
        status_at_this_point: 'blocked',
        timestamp: '2026-09-14T16:28:00Z',
      },
      // Branch 2
      {
        node_id: 'opt-3b',
        prev_id: 'opt-2',
        type: 'turn',
        content: 'Branch 2 [Claude]: Built HNSW index with m=16, ef_construction=128 and cast embeddings to 16-bit halfvec to conserve RAM cache.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T16:32:00Z',
      },
      {
        node_id: 'opt-4b',
        prev_id: 'opt-3b',
        type: 'turn',
        content: 'Branch 2 [Claude]: HNSW benchmark: 8.4ms latency at 98.6% recall. RAM usage down 50% with halfvec precision.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T16:45:00Z',
      },
      {
        node_id: 'opt-5',
        prev_id: 'opt-4b',
        type: 'checkpoint',
        content: 'Checkpoint: HNSW + halfvec selected as production standard. IVFFlat branch discarded. Memory snapshot preserved for execution engine.',
        model_used: 'claude',
        status_at_this_point: 'done',
        timestamp: '2026-09-14T16:55:00Z',
      },
      {
        node_id: 'opt-6',
        prev_id: 'opt-5',
        type: 'turn',
        content: 'Claude ongoing: Provisioning read-replica warming script and vacuum scheduling for HNSW index pages.',
        model_used: 'claude',
        status_at_this_point: 'in_progress',
        timestamp: '2026-09-14T17:10:00Z',
      },
    ],
  },
];
