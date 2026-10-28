import express, { Request, Response, NextFunction } from 'express';
import { MemoryStore, MemoryNode } from './store';

export interface AppConfig {
  store: MemoryStore;
  authToken?: string;
}

export function isValidSessionId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

export function createApp(config: AppConfig) {
  const app = express();
  app.use(express.json());

  const authToken = config.authToken || process.env.AUTH_TOKEN || 'test-bearer-token';

  // Bearer authentication middleware (same as /chat)
  const requireBearerAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: missing or invalid authorization header' });
    }
    const token = authHeader.slice(7).trim();
    if (token !== authToken) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
    next();
  };

  // /chat route
  app.post('/chat', requireBearerAuth, (req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // 1. GET /sessions -> [{ id, title, description, updatedAt, status }]
  app.get('/sessions', requireBearerAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionIds = await config.store.listSessions();
      const sessions = [];

      for (const id of sessionIds) {
        const nodes = await config.store.getAllNodes(id);
        if (!nodes || nodes.length === 0) continue;

        const firstTurn = nodes.find((n) => n.type === 'turn') || nodes[0];
        const title = (firstTurn.content || '').slice(0, 60);

        const head = await config.store.getHead(id);
        const newestNode = head || nodes[nodes.length - 1];
        const updatedAt = newestNode.timestamp;
        const status = newestNode.status_at_this_point === 'blocked' ? 'blocked' : 'active';

        sessions.push({
          id,
          title,
          description: title,
          updatedAt,
          status,
        });
      }

      res.json(sessions);
    } catch (err) {
      next(err);
    }
  });

  // 2. GET /sessions/:id/graph -> { id, title, nodes: MemoryNode[] }
  app.get('/sessions/:id/graph', requireBearerAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!isValidSessionId(id)) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }

      const nodes = await config.store.getAllNodes(id);
      if (!nodes || nodes.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const firstTurn = nodes.find((n) => n.type === 'turn') || nodes[0];
      const title = (firstTurn.content || '').slice(0, 60);

      const mappedNodes = nodes.map((node) => {
        const item: {
          node_id: string;
          prev_id: string | null;
          type: 'turn' | 'checkpoint';
          content: string;
          reply: string | null;
          model_used: string;
          status_at_this_point: 'done' | 'blocked';
          timestamp: string;
          failed_providers?: string[];
        } = {
          node_id: node.node_id,
          prev_id: node.prev_id ?? null,
          type: node.type,
          content: node.content,
          reply: node.reply !== undefined ? node.reply : null,
          model_used: node.model_used,
          status_at_this_point: node.status_at_this_point,
          timestamp: node.timestamp,
        };

        if (node.failed_providers && node.failed_providers.length > 0) {
          item.failed_providers = node.failed_providers;
        }

        return item;
      });

      res.json({
        id,
        title,
        nodes: mappedNodes,
      });
    } catch (err) {
      next(err);
    }
  });

  return app;
}
