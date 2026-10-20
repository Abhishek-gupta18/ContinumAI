const VALID_SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

function validateSessionId(sessionId) {
  return typeof sessionId === 'string' && VALID_SESSION_ID.test(sessionId);
}

function createSessionsRouter(memory) {
  async function listSessions(req, res) {
    try {
      const sessions = await memory.listSessions();
      return res.status(200).json({ sessions });
    } catch (err) {
      console.error('[memory] listSessions failed:', err.message, err.code ?? '');
      return res.status(503).json({
        error: {
          type: 'memory_unavailable',
          message: 'Conversation memory is unavailable',
        },
      });
    }
  }

  async function getSessionNodes(req, res) {
    const { id } = req.params;
    if (!validateSessionId(id)) {
      return res.status(400).json({
        error: { type: 'validation', message: 'Invalid session_id' },
      });
    }

    try {
      const nodes = await memory.getSessionNodes(id);
      if (nodes === null) {
        return res.status(404).json({
          error: { type: 'not_found', message: 'Session not found' },
        });
      }
      return res.status(200).json({ session_id: id, nodes });
    } catch (err) {
      console.error('[memory] getSessionNodes failed:', err.message, err.code ?? '');
      return res.status(503).json({
        error: {
          type: 'memory_unavailable',
          message: 'Conversation memory is unavailable',
        },
      });
    }
  }

  return { listSessions, getSessionNodes };
}

module.exports = { createSessionsRouter, validateSessionId };
