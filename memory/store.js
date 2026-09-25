const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const SESSIONS_DIR = path.join(__dirname, '..', 'data', 'sessions');

function ensureSessionDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function readSessionFile(sessionId) {
  ensureSessionDir();
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function writeSessionFile(sessionId, data) {
  ensureSessionDir();
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateNodeId() {
  return randomUUID();
}

module.exports = {
  appendNode(sessionId, nodeFields) {
    ensureSessionDir();

    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    let sessionData = null;
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      sessionData = JSON.parse(data);
    }

    let prevId = sessionData ? sessionData.head_id : null;

    let turnCountSinceCheckpoint = 0;
    let lastTurnNodeId = null;
    let turnsSinceCheckpoint = [];

    if (sessionData && sessionData.head_id) {
      let currentId = sessionData.head_id;
      while (currentId) {
        const node = sessionData.nodes[currentId];
        if (!node) break;

        if (node.type === 'checkpoint') {
          break;
        }

        if (node.type === 'turn') {
          turnCountSinceCheckpoint++;
          turnsSinceCheckpoint.push(node);
          lastTurnNodeId = currentId;
        }

        if (turnCountSinceCheckpoint >= 5) break;

        currentId = node.prev_id;
      }
    }

    if (turnCountSinceCheckpoint >= 5) {
      const fiveTurns = turnsSinceCheckpoint.slice(0, 5);
      const concatenatedContent = fiveTurns.reverse().map((n) => n.content).join(' ');
      const fifthTurnNodeId = fiveTurns[fiveTurns.length - 1].node_id;

      const checkpointNode = {
        node_id: generateNodeId(),
        prev_id: fifthTurnNodeId,
        session_id: sessionId,
        type: 'checkpoint',
        content: concatenatedContent,
        model_used: '',
        status_at_this_point: 'in_progress',
        references: null,
        timestamp: new Date().toISOString(),
      };

      if (!sessionData) {
        sessionData = { head_id: checkpointNode.node_id, nodes: {} };
      } else {
        sessionData.nodes[checkpointNode.node_id] = checkpointNode;
      }

      prevId = checkpointNode.node_id;
    }

    const node = {
      node_id: generateNodeId(),
      prev_id: prevId,
      session_id: sessionId,
      type: nodeFields.type || 'turn',
      content: nodeFields.content || '',
      model_used: nodeFields.model_used || '',
      status_at_this_point: nodeFields.status_at_this_point || 'in_progress',
      references: nodeFields.references !== undefined ? nodeFields.references : null,
      timestamp: new Date().toISOString(),
    };

    if (!sessionData) {
      sessionData = { head_id: node.node_id, nodes: {} };
    }

    sessionData.nodes[node.node_id] = node;
    sessionData.head_id = node.node_id;

    writeSessionFile(sessionId, sessionData);

    return node;
  },

  getHead(sessionId) {
    ensureSessionDir();
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = readSessionFile(sessionId);
    return data ? data.head_id : null;
  },

  getContextForHandoff(sessionId) {
    ensureSessionDir();
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
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
  },

  getAllNodes(sessionId) {
    ensureSessionDir();
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = readSessionFile(sessionId);
    if (!data || !data.nodes) {
      return [];
    }
    return Object.values(data.nodes);
  },
};