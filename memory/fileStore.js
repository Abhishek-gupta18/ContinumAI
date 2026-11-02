/*
Storage contract (fileStore implementation):

- async getTail(userId, sessionId) → nodes from the latest checkpoint (inclusive) to the head, oldest first; all nodes if there is no checkpoint; [] if the session doesn't exist.
- async appendNodes(userId, sessionId, nodes) → persists 1–2 fully-formed nodes in order, in one write; the caller sets node_id, prev_id and timestamps; head becomes the last node.
- async getAllNodes(userId, sessionId) → all nodes.
- async listSessions(userId) → persisted session summaries for that user (null = legacy root).
- async getSessionNodes(userId, sessionId) → null for an unknown session, otherwise all nodes.
- async getHead(userId, sessionId) → head node_id or null.

userId is null (legacy, files at the sessions root) or a UUID string (files under sessions/users/<userId>/).

The store holds NO business logic (no thresholds, no formatting).
*/

const fs = require('fs');
const path = require('path');

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUserId(userId) {
  if (userId !== null && typeof userId !== 'string') {
    throw new TypeError('userId must be null or a UUID string');
  }
  if (typeof userId === 'string' && !USER_ID.test(userId)) {
    throw new TypeError('userId must be null or a UUID string');
  }
}

function createFileStore(options = {}) {
  const configuredSessionsDir = options.sessionsDir;

  function getSessionsDir() {
    return configuredSessionsDir || process.env.SESSIONS_DIR || path.join(__dirname, '..', 'data', 'sessions');
  }

  function ensureSessionDir(userId) {
    const dir = userId === null ? getSessionsDir() : path.join(getSessionsDir(), 'users', userId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function sessionFilePath(sessionId, userId = null) {
    const resolvedSessionsDir = path.resolve(getSessionsDir());
    const userDir = userId === null ? resolvedSessionsDir : path.join(resolvedSessionsDir, 'users', userId);
    const filePath = path.resolve(userDir, `${sessionId}.json`);
    if (!filePath.startsWith(userDir + path.sep) && filePath !== userDir) {
      throw new Error('Path traversal attempt');
    }
    return filePath;
  }

  function readSessionFile(sessionId, userId) {
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  function writeSessionFile(sessionId, userId, data) {
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async function getTail(userId, sessionId) {
    validateUserId(userId);
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const data = readSessionFile(sessionId, userId);
    if (!data || !data.nodes) {
      return [];
    }

    const headId = data.head_id;
    if (!headId) {
      return [];
    }

    const chain = [];
    let currentId = headId;

    while (currentId) {
      const node = data.nodes[currentId];
      if (!node) break;
      chain.push(node);
      currentId = node.prev_id;
    }

    chain.reverse();

    let checkpointIndex = -1;
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i].type === 'checkpoint') {
        checkpointIndex = i;
        break;
      }
    }

    let result;
    if (checkpointIndex >= 0) {
      result = chain.slice(checkpointIndex);
    } else {
      result = chain;
    }

    return result;
  }

  async function appendNodes(userId, sessionId, nodes) {
    validateUserId(userId);
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);

    let sessionData = null;
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      sessionData = JSON.parse(data);
    }

    if (!sessionData) {
      sessionData = { head_id: null, nodes: {} };
    }

    for (const node of nodes) {
      sessionData.nodes[node.node_id] = node;
      sessionData.head_id = node.node_id;
    }

    writeSessionFile(sessionId, userId, sessionData);
  }

  function ensureNodeDefaults(node) {
    return {
      ...node,
      provider: node.provider ?? null,
      failed_providers: node.failed_providers ?? [],
    };
  }

  async function getAllNodes(userId, sessionId) {
    validateUserId(userId);
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = readSessionFile(sessionId, userId);
    if (!data || !data.nodes) {
      return [];
    }
    return Object.values(data.nodes).map(ensureNodeDefaults);
  }

  async function getSessionNodes(userId, sessionId) {
    validateUserId(userId);
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = readSessionFile(sessionId, userId);
    if (!data || !data.nodes) {
      return [];
    }
    return Object.values(data.nodes).map(ensureNodeDefaults);
  }

  async function listSessions(userId = null) {
    validateUserId(userId);
    ensureSessionDir(userId);
    const sessions = [];

    const dir = userId === null ? getSessionsDir() : path.join(getSessionsDir(), 'users', userId);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const sessionId = entry.name.slice(0, -'.json'.length);
      const nodes = await getSessionNodes(userId, sessionId);
      if (nodes === null) {
        continue;
      }

      const timestamps = nodes
        .map((node) => node.timestamp)
        .filter((timestamp) => typeof timestamp === 'string')
        .sort();
      const models = [...new Set(
        nodes
          .map((node) => node.model_used)
          .filter((model) => typeof model === 'string' && model.length > 0)
      )];

      // Find first turn node for title
      const firstTurn = nodes.find(n => n.type === 'turn');
      let title = '';
      if (firstTurn && firstTurn.content) {
        title = firstTurn.content.length > 60 ? firstTurn.content.slice(0, 60) : firstTurn.content;
      }

      sessions.push({
        id: sessionId,
        node_count: nodes.length,
        latest_activity: timestamps[timestamps.length - 1] || null,
        models,
        title,
      });
    }

    return sessions.sort((a, b) => {
      if (a.latest_activity === b.latest_activity) return a.id.localeCompare(b.id);
      if (a.latest_activity === null) return 1;
      if (b.latest_activity === null) return -1;
      return b.latest_activity.localeCompare(a.latest_activity);
    });
  }

  async function getHead(userId, sessionId) {
    validateUserId(userId);
    ensureSessionDir(userId);
    const filePath = sessionFilePath(sessionId, userId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = readSessionFile(sessionId, userId);
    return data ? data.head_id : null;
  }

  return {
    getTail,
    appendNodes,
    getAllNodes,
    getSessionNodes,
    listSessions,
    getHead,
  };
}

module.exports = { createFileStore };