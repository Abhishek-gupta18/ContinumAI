import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Send } from 'lucide-react';
import { ApiError, getSessionNodes, getSessions, sendChat } from './api/client';
import { MemoryNode, Session } from './types';
import { SessionSidebar } from './components/SessionSidebar';
import { GraphView } from './components/GraphView';
import { DetailPanel } from './components/DetailPanel';

function mapApiError(status: number): string {
  switch (status) {
    case 401:
      return 'Gateway token missing or wrong; check the dev server env';
    case 400:
      return 'That session id or message isn\'t valid';
    case 429:
      return 'Rate limited, try again in a moment';
    case 0:
      return 'Couldn\'t reach the gateway';
    default:
      if (status >= 500) return 'Couldn\'t reach the gateway';
      return `Request failed with status ${status}`;
  }
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [nodesBySession, setNodesBySession] = useState<Record<string, MemoryNode[]>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [centerNodeTrigger, setCenterNodeTrigger] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodesError, setNodesError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatReply, setChatReply] = useState<string | null>(null);

  const loadSessions = async (preferredSessionId?: string | null) => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const response = await getSessions();
      const nextSessions = response.sessions.map((summary) => ({
        ...summary,
        nodes: nodesBySession[summary.id] || [],
      }));
      setSessions(nextSessions);
      setSelectedSessionId((current) => {
        const candidate = preferredSessionId || current;
        return candidate && nextSessions.some((session) => session.id === candidate)
          ? candidate
          : nextSessions[0]?.id || null;
      });
    } catch (error) {
      setSessionsError(error instanceof ApiError ? error.message : 'Unable to load sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadNodes = async (sessionId: string) => {
    setNodesLoading(true);
    setNodesError(null);
    try {
      const response = await getSessionNodes(sessionId);
      setNodesBySession((current) => ({ ...current, [sessionId]: response.nodes }));
      setSessions((current) =>
        current.map((session) => session.id === sessionId
          ? { ...session, nodes: response.nodes, node_count: response.nodes.length }
          : session)
      );
      setSelectedNodeId((current) =>
        response.nodes.some((node) => node.node_id === current)
          ? current
          : response.nodes[response.nodes.length - 1]?.node_id || null
      );
    } catch (error) {
      setNodesError(error instanceof ApiError ? error.message : 'Unable to load session nodes.');
      setNodesBySession((current) => ({ ...current, [sessionId]: [] }));
      setSelectedNodeId(null);
    } finally {
      setNodesLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      void loadNodes(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Active session
  const currentSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((session) => session.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);
  const currentNodes = currentSession ? nodesBySession[currentSession.id] || currentSession.nodes : [];

  // Active selected node
  const currentNode = currentNodes.find((node) => node.node_id === selectedNodeId) || null;

  // Handler when user selects a different session
  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSelectedNodeId(null);
    setChatError(null);
    setChatReply(null);
  };

  // Handler when user selects a node
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  // Handler to center view on a specific node
  const handleCenterNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setCenterNodeTrigger(nodeId + '-' + Date.now());
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSessionId || !message.trim() || chatLoading) return;

    setChatLoading(true);
    setChatError(null);
    setChatReply(null);
    try {
      const response = await sendChat(selectedSessionId, message.trim());
      setMessage('');
      setChatReply(`${response.reply} (${response.model_used})`);
      await loadSessions(selectedSessionId);
      await loadNodes(selectedSessionId);
    } catch (error) {
      setChatError(error instanceof ApiError ? mapApiError(error.status) : 'Couldn\'t reach the gateway');
    } finally {
      setChatLoading(false);
    }
  };

  const retryCurrentLoad = () => {
    if (selectedSessionId) {
      void loadNodes(selectedSessionId);
    } else {
      void loadSessions();
    }
  };

  return (
    <div
      id="continum-ai-app"
      className="w-screen h-screen flex bg-[#101013] text-[#dcdde7] font-sans antialiased overflow-hidden"
    >
      {/* 1. Left Sidebar: Sessions / Tasks */}
      <SessionSidebar
        sessions={sessions}
        selectedSessionId={selectedSessionId || ''}
        onSelectSession={handleSelectSession}
        collapsed={leftSidebarCollapsed}
        onToggleCollapse={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
      />

      {/* 2. Center Panel: Memory Graph View */}
      <main className="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden bg-[#101013]">
        {sessionsLoading ? (
          <StatusMessage message="Loading persisted sessions..." loading />
        ) : sessionsError ? (
          <StatusMessage message={sessionsError} onRetry={() => void loadSessions()} />
        ) : !currentSession ? (
          <StatusMessage message="No persisted sessions are available." />
        ) : nodesError ? (
          <StatusMessage message={nodesError} onRetry={retryCurrentLoad} />
        ) : nodesLoading ? (
          <StatusMessage message="Loading persisted memory nodes..." loading />
        ) : currentNodes.length === 0 ? (
          <StatusMessage message="This session has no persisted memory nodes yet." />
        ) : (
          <GraphView
            session={{ ...currentSession, nodes: currentNodes }}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            centerNodeTrigger={centerNodeTrigger}
          />
        )}

        {currentSession && (
          <form
            onSubmit={handleSendMessage}
            className="absolute bottom-4 left-4 right-4 z-40 flex gap-2 rounded-xl border border-[#2d2d3c] bg-[#17171d]/95 p-2 shadow-xl backdrop-blur-md"
          >
            <input
              id="chat-message-input"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Send a message to ${currentSession.id}...`}
              disabled={chatLoading}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[#e2e2ec] placeholder-[#68697c] focus:outline-none"
            />
            <button
              id="chat-submit-btn"
              type="submit"
              disabled={chatLoading || !message.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
          </form>
        )}
        {(chatError || chatReply) && (
          <div className="absolute bottom-20 left-4 right-4 z-40 rounded-lg border border-[#2d2d3c] bg-[#17171d] px-3 py-2 text-xs">
            {chatError ? <span className="text-rose-300">{chatError}</span> : <span className="text-emerald-300">{chatReply}</span>}
          </div>
        )}
      </main>

      {/* 3. Right Sidebar: Node Detail Panel */}
      <DetailPanel
        selectedNode={currentNode}
        allNodes={currentNodes}
        onSelectNode={handleSelectNode}
        onCenterNode={handleCenterNode}
        collapsed={rightSidebarCollapsed}
        onToggleCollapse={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
      />
    </div>
  );
}

function StatusMessage({
  message,
  loading = false,
  onRetry,
}: {
  message: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-[#8b8ca1]">
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-400" /> : <AlertCircle className="h-6 w-6 text-[#68697c]" />}
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#343443] px-3 py-1.5 text-xs text-[#c6c7d5] hover:bg-[#20202a]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
