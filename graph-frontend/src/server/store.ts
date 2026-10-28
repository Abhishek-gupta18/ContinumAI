import fs from 'node:fs/promises';
import path from 'node:path';

export interface MemoryNode {
  node_id: string;
  prev_id: string | null;
  type: 'turn' | 'checkpoint';
  content: string;
  reply: string | null;
  model_used: string;
  status_at_this_point: 'done' | 'blocked';
  timestamp: string;
  failed_providers?: string[];
}

export interface MemoryStore {
  listSessions(): Promise<string[]>;
  getAllNodes(sessionId: string): Promise<MemoryNode[]>;
  getHead(sessionId: string): Promise<MemoryNode | null>;
  appendNode?(sessionId: string, node: MemoryNode): Promise<void>;
}

export function fileStore(baseDir: string): MemoryStore {
  return {
    async listSessions(): Promise<string[]> {
      try {
        const entries = await fs.readdir(baseDir);
        return entries
          .filter((e) => e.endsWith('.json'))
          .map((e) => e.slice(0, -5));
      } catch (err: any) {
        if (err.code === 'ENOENT') return [];
        throw err;
      }
    },
    async getAllNodes(sessionId: string): Promise<MemoryNode[]> {
      const file = path.join(baseDir, `${sessionId}.json`);
      try {
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(raw);
      } catch (err: any) {
        if (err.code === 'ENOENT') return [];
        throw err;
      }
    },
    async getHead(sessionId: string): Promise<MemoryNode | null> {
      const nodes = await this.getAllNodes(sessionId);
      return nodes.length > 0 ? nodes[nodes.length - 1] : null;
    },
    async appendNode(sessionId: string, node: MemoryNode): Promise<void> {
      await fs.mkdir(baseDir, { recursive: true });
      const nodes = await this.getAllNodes(sessionId);
      nodes.push(node);
      const file = path.join(baseDir, `${sessionId}.json`);
      await fs.writeFile(file, JSON.stringify(nodes, null, 2), 'utf8');
    },
  };
}

export function pgStore(db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }): MemoryStore {
  return {
    async listSessions(): Promise<string[]> {
      const { rows } = await db.query(
        'SELECT DISTINCT session_id FROM memory_nodes ORDER BY session_id'
      );
      return rows.map((r: any) => r.session_id);
    },
    async getAllNodes(sessionId: string): Promise<MemoryNode[]> {
      const { rows } = await db.query(
        'SELECT * FROM memory_nodes WHERE session_id = $1 ORDER BY timestamp ASC',
        [sessionId]
      );
      return rows.map((r: any) => ({
        node_id: r.node_id,
        prev_id: r.prev_id ?? null,
        type: r.type,
        content: r.content,
        reply: r.reply ?? null,
        model_used: r.model_used,
        status_at_this_point: r.status_at_this_point,
        timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date(r.timestamp).toISOString(),
        ...(r.failed_providers && r.failed_providers.length > 0 ? { failed_providers: r.failed_providers } : {}),
      }));
    },
    async getHead(sessionId: string): Promise<MemoryNode | null> {
      const { rows } = await db.query(
        'SELECT * FROM memory_nodes WHERE session_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [sessionId]
      );
      if (!rows.length) return null;
      const r = rows[0];
      return {
        node_id: r.node_id,
        prev_id: r.prev_id ?? null,
        type: r.type,
        content: r.content,
        reply: r.reply ?? null,
        model_used: r.model_used,
        status_at_this_point: r.status_at_this_point,
        timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date(r.timestamp).toISOString(),
        ...(r.failed_providers && r.failed_providers.length > 0 ? { failed_providers: r.failed_providers } : {}),
      };
    },
  };
}
