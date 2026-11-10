import { useCallback, useEffect, useRef, useState } from 'react';
import { getSessions, getProviders, getSessionNodes, postChat } from '../../api/endpoints';
import { ApiError } from '../../api/http';
import type { SessionSummary } from '../../api/types';
import { describeChatError, newSessionId, nodesToMessages, sortSessions, validateMessage, type ChatError, type ChatMessage } from './logic';
import type { MemoryNode } from '../../api/types';

export interface PlaygroundHook {
  status: 'loading' | 'ready' | 'error';
  pageError: string;
  sessions: SessionSummary[];
  providers: string[];
  selectedId: string;
  messages: ChatMessage[];
  pendingText: string | null;
  nodesLoading: boolean;
  nodesError: string;
  sending: boolean;
  sendError: ChatError | null;
  warning: string;
  invalidMessage: string;
  selectSession: (id: string) => void;
  newSession: () => void;
  send: (text: string, provider: string | null) => Promise<boolean>;
  retryLoad: () => void;
  clearSendError: () => void;
}

export function usePlayground(): PlaygroundHook {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageError, setPageError] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodesError, setNodesError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<ChatError | null>(null);
  const [warning, setWarning] = useState('');
  const [invalidMessage, setInvalidMessage] = useState('');
  const selectTokenRef = useRef(0);

  const loadInitial = useCallback(async () => {
    setStatus('loading');
    setPageError('');
    try {
      const [sessionsResp, providersResp] = await Promise.all([getSessions(), getProviders()]);
      setSessions(sortSessions(sessionsResp.sessions));
      setProviders(providersResp.providers);
      // S1: never auto-select an old session; start on a fresh empty draft
      // session (nothing is stored on the server until the first message).
      setSelectedId((current) => (current === '' ? newSessionId() : current));
      setStatus('ready');
    } catch {
      setPageError('Could not load the playground. Check that the gateway is reachable.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadNodes = useCallback(async (id: string) => {
    const token = ++selectTokenRef.current;
    setNodesLoading(true);
    setNodesError('');
    try {
      const resp = await getSessionNodes(id);
      if (token !== selectTokenRef.current) return; // stale: the selection changed meanwhile
      setNodes(resp.nodes);
    } catch (err) {
      if (token !== selectTokenRef.current) return;
      setNodes([]);
      setNodesError(
        err instanceof ApiError && err.type === 'not_found'
          ? 'This session does not exist.'
          : 'Could not load this memory chain.',
      );
    } finally {
      if (token === selectTokenRef.current) setNodesLoading(false);
    }
  }, []);

  const selectSession = useCallback(
    (id: string) => {
      if (id === selectedId) return;
      setSelectedId(id);
      setNodes([]);
      void loadNodes(id);
    },
    [selectedId, loadNodes],
  );

  const newSession = useCallback(() => {
    setSelectedId(newSessionId());
    setNodes([]);
    setNodesError('');
    setSendError(null);
    setWarning('');
    setInvalidMessage('');
    setPendingText(null);
  }, []);

  const send = useCallback(
    async (text: string, provider: string | null): Promise<boolean> => {
      const valid = validateMessage(text);
      if (valid.ok === false) {
        setInvalidMessage(valid.error);
        return false;
      }
      setInvalidMessage('');
      if (sending || selectedId === '') return false;

      setSending(true);
      setSendError(null);
      setWarning('');
      setPendingText(valid.text); // shown as a user bubble with "Sending…" until the nodes reload

      try {
        await postChat(selectedId, valid.text, provider ?? undefined);
        try {
          const [nodesResp, sessionsResp] = await Promise.all([
            getSessionNodes(selectedId),
            getSessions(),
          ]);
          setNodes(nodesResp.nodes);
          setSessions(sortSessions(sessionsResp.sessions));
        } catch {
          // POST succeeded (message saved) but the history reload failed.
          setSendError({ message: 'The reply was stored, but the history could not be reloaded.', action: 'retry' });
        }
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // The global handler signs out and navigates to /login.
          return false;
        }
        if (err instanceof ApiError && err.type !== 'no_providers') {
          // A blocked turn may have been stored: reload to be exact.
          try {
            const resp = await getSessionNodes(selectedId);
            setNodes(resp.nodes);
            const sessionsResp = await getSessions();
            setSessions(sortSessions(sessionsResp.sessions));
          } catch {
            setNodes([]);
          }
        }
        setSendError(describeChatError(err));
        return false;
      } finally {
        setPendingText(null);
        setSending(false);
      }
    },
    [selectedId, sending],
  );

  const retryLoad = useCallback(() => {
    void loadInitial();
  }, [loadInitial]);

  const clearSendError = useCallback(() => setSendError(null), []);

  return {
    status,
    pageError,
    sessions,
    providers,
    selectedId,
    messages: nodesToMessages(nodes),
    pendingText,
    nodesLoading,
    nodesError,
    sending,
    sendError,
    warning,
    invalidMessage,
    selectSession,
    newSession,
    send,
    retryLoad,
    clearSendError,
  };
}
