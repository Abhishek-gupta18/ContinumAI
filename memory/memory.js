const { randomUUID } = require('crypto');

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

const sessionQueues = new Map();

function getSessionQueue(sessionId) {
  if (!sessionQueues.has(sessionId)) {
    sessionQueues.set(sessionId, Promise.resolve());
  }
  return sessionQueues.get(sessionId);
}

function runSerialized(sessionId, fn) {
  const queue = getSessionQueue(sessionId);
  const next = queue.then(() => fn());
  sessionQueues.set(sessionId, next.catch(() => {}));
  return next;
}

function cleanupQueue(sessionId) {
  const queue = sessionQueues.get(sessionId);
  if (queue) {
    queue.then(() => {
      if (sessionQueues.get(sessionId) === queue) {
        sessionQueues.delete(sessionId);
      }
    });
  }
}

function createMemory(store) {
  function bindUser(userId) {
    const queueKey = (sessionId) => `${userId ?? ''}:${sessionId}`;

    async function appendNode(sessionId, nodeFields) {
      return runSerialized(queueKey(sessionId), () => appendNodeInner(sessionId, nodeFields));
    }

    async function appendNodeInner(sessionId, nodeFields) {
      const tail = await store.getTail(userId, sessionId);
      let prevId = null;
      const nodesToAppend = [];

      let turnCount = 0;
      const turnsSinceCheckpoint = [];
      for (const node of tail) {
        if (node.type === 'turn') {
          turnCount++;
          turnsSinceCheckpoint.push(node);
        }
      }

      if (turnCount >= 5) {
        const newestTurn = turnsSinceCheckpoint[turnsSinceCheckpoint.length - 1];
        const oldestFirst = turnsSinceCheckpoint.slice(-5);
        const concatenatedContent = oldestFirst
          .map((n) => formatNodeText(n))
          .filter((text) => text !== null)
          .join('\n');

        const checkpointNode = {
          node_id: randomUUID(),
          prev_id: newestTurn.node_id,
          session_id: sessionId,
          type: 'checkpoint',
          content: concatenatedContent,
          model_used: '',
          status_at_this_point: newestTurn.status_at_this_point,
          references: null,
          timestamp: new Date().toISOString(),
        };

        nodesToAppend.push(checkpointNode);
        prevId = checkpointNode.node_id;
      } else {
        prevId = tail.length > 0 ? tail[tail.length - 1].node_id : null;
      }

      const node = {
        node_id: randomUUID(),
        prev_id: prevId,
        session_id: sessionId,
        type: nodeFields.type || 'turn',
        content: nodeFields.content || '',
        reply: nodeFields.reply !== undefined ? nodeFields.reply : null,
        model_used: nodeFields.model_used || '',
        status_at_this_point: nodeFields.status_at_this_point || 'in_progress',
        references: nodeFields.references !== undefined ? nodeFields.references : null,
        provider: nodeFields.provider ?? null,
        failed_providers: nodeFields.failed_providers ?? [],
        timestamp: new Date().toISOString(),
      };

      nodesToAppend.push(node);
      await store.appendNodes(userId, sessionId, nodesToAppend);
      cleanupQueue(queueKey(sessionId));
      return node;
    }

    async function getContextForHandoff(sessionId) {
      return store.getTail(userId, sessionId);
    }

    async function buildContextText(sessionId) {
      const nodes = await store.getTail(userId, sessionId);
      return nodes
        .map((node) => formatNodeText(node))
        .filter((text) => text !== null)
        .join('\n');
    }

    async function getAllNodes(sessionId) {
      return store.getAllNodes(userId, sessionId);
    }

    async function getSessionNodes(sessionId) {
      return store.getSessionNodes(userId, sessionId);
    }

    async function listSessions() {
      return store.listSessions(userId);
    }

    async function getHead(sessionId) {
      return store.getHead(userId, sessionId);
    }

    return {
      appendNode,
      getContextForHandoff,
      buildContextText,
      getAllNodes,
      getSessionNodes,
      listSessions,
      getHead,
    };
  }

  const memory = bindUser(null);
  memory.forUser = bindUser;
  return memory;
}

module.exports = { createMemory, formatNodeText };