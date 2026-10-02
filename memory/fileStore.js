/*
Storage contract (fileStore implementation):

- async getTail(sessionId) → nodes from the latest checkpoint (inclusive) to the head, oldest first; all nodes if there is no checkpoint; [] if the session doesn't exist.
- async appendNodes(sessionId, nodes) → persists 1–2 fully-formed nodes in order, in one write; the caller sets node_id, prev_id and timestamps; head becomes the last node.
- async getAllNodes(sessionId) → all nodes.
- async getHead(sessionId) → head node_id or null.

The store holds NO business logic (no thresholds, no formatting).
*/

const fs = require('fs');
const path = require('path');

function getSessionsDir() {
  return process.env.SESSIONS_DIR || path.join(__dirname, '..', 'data', 'sessions');
}

function ensureSessionDir() {
  const dir = getSessionsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sessionFilePath(sessionId) {
  const sessionsDir = path.resolve(getSessionsDir());
  const filePath = path.resolve(sessionsDir, `${sessionId}.json`);
  if (!filePath.startsWith(sessionsDir + path.sep) && filePath !== sessionsDir) {
    throw new Error('Path traversal attempt');
  }
  return filePath;
}

function readSessionFile(sessionId) {
  ensureSessionDir();
  const filePath = sessionFilePath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function writeSessionFile(sessionId, data) {
  ensureSessionDir();
  const filePath = sessionFilePath(sessionId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function getTail(sessionId) {
  ensureSessionDir();
  const filePath = sessionFilePath(sessionId);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = readSessionFile(sessionId);
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

  const checkpointIndex = chain.findIndex(node => node.type === 'checkpoint');

  let result;
  if (checkpointIndex >= 0) {
    result = chain.slice(checkpointIndex);
  } else {
    result = chain;
  }

  return result;
}

async function appendNodes(sessionId, nodes) {
  ensureSessionDir();
  const filePath = sessionFilePath(sessionId);

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

  writeSessionFile(sessionId, sessionData);
}

async function getAllNodes(sessionId) {
  ensureSessionDir();
  const filePath = sessionFilePath(sessionId);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = readSessionFile(sessionId);
  if (!data || !data.nodes) {
    return [];
  }
  return Object.values(data.nodes);
}

async function getHead(sessionId) {
  ensureSessionDir();
  const filePath = sessionFilePath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = readSessionFile(sessionId);
  return data ? data.head_id : null;
}

function createFileStore() {
  return {
    getTail,
    appendNodes,
    getAllNodes,
    getHead,
  };
}

module.exports = { createFileStore };