const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function getSessionsDir() {
  return process.env.SESSIONS_DIR || path.join(__dirname, '..', 'data', 'sessions');
}

function ensureSessionDir() {
  const dir = getSessionsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSessionFile(sessionId) {
  ensureSessionDir();
  const filePath = path.join(getSessionsDir(), `${sessionId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function writeSessionFile(sessionId, data) {
  ensureSessionDir();
  const filePath = path.join(getSessionsDir(), `${sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateNodeId() {
  return randomUUID();
}

// Module-level so both the export and buildContextText can call it (method
// shorthand inside an object literal creates no scope binding).
function getContextNodes(sessionId) {
  ensureSessionDir();
  const filePath = path.join(getSessionsDir(), `${sessionId}.json`);
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

// Single place for transcript formatting (D3/D4).
// checkpoint node → its content as is; turn node with status 'done' and a
// non-null reply → "User: <content>\nAssistant: <reply>"; anything else → null (skipped).
function formatNodeText(node) {
  if (!node) return null;
  if (node.type === 'checkpoint') {
    return node.content;
  }
  if (node.type === 'turn' && node.status_at_this_point === 'done' && node.reply != null) {
    return `User: ${node.content}\nAssistant: ${node.reply}`;
  }
  return null;
}

module.exports = {
  appendNode(sessionId, nodeFields) {
    ensureSessionDir();

    const filePath = path.join(getSessionsDir(), `${sessionId}.json`);

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
      // turnsSinceCheckpoint is newest-first; make it oldest-first (P5/D4).
      const oldestFirst = turnsSinceCheckpoint.slice(0, 5).reverse();
      const newestTurn = oldestFirst[oldestFirst.length - 1];
      const concatenatedContent = oldestFirst
        .map((n) => formatNodeText(n))
        .filter((text) => text !== null)
        .join('\n');

      const checkpointNode = {
        node_id: generateNodeId(),
        prev_id: newestTurn.node_id,
        session_id: sessionId,
        type: 'checkpoint',
        content: concatenatedContent,
        model_used: '',
        status_at_this_point: newestTurn.status_at_this_point,
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
      reply: nodeFields.reply !== undefined ? nodeFields.reply : null,
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
    const filePath = path.join(getSessionsDir(), `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = readSessionFile(sessionId);
    return data ? data.head_id : null;
  },

  getContextForHandoff(sessionId) {
    return getContextNodes(sessionId);
  },

  // D3: transcript text built from the handoff chain. '' for a new session.
  buildContextText(sessionId) {
    const nodes = getContextNodes(sessionId);
    return nodes
      .map((node) => formatNodeText(node))
      .filter((text) => text !== null)
      .join('\n');
  },

  getAllNodes(sessionId) {
    ensureSessionDir();
    const filePath = path.join(getSessionsDir(), `${sessionId}.json`);
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
