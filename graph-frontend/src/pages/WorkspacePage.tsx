import React, { useState, useEffect } from 'react';
import { Session, MemoryNode } from '../types';
import { listSessions, createSession, renameSession, deleteSession, sendChat } from '../api';
import { AppNavbar } from '../components/AppNavbar';
import { SessionSidebar } from '../components/SessionSidebar';
import { GraphView } from '../components/GraphView';
import { DetailPanel } from '../components/DetailPanel';
import { ChatComposerPanel } from '../components/ChatComposerPanel';

export const WorkspacePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [centerNodeTrigger, setCenterNodeTrigger] = useState<string | null>(null);

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const list = await listSessions();
    setSessions(list);
    if (list.length > 0 && !selectedSessionId) {
      setSelectedSessionId(list[0].id);
      if (list[0].nodes.length > 0) {
        setSelectedNodeId(list[0].nodes[0].node_id);
      }
    }
  };

  // Active session & node
  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  const currentNode =
    currentSession?.nodes.find((n) => n.node_id === selectedNodeId) || null;

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session && session.nodes.length > 0) {
      const defaultNode =
        session.nodes.find((n) => n.type === 'decision') || session.nodes[0];
      setSelectedNodeId(defaultNode.node_id);
    } else {
      setSelectedNodeId(null);
    }
  };

  const handleCreateSession = async () => {
    const newSession = await createSession();
    setSessions([newSession, ...sessions]);
    setSelectedSessionId(newSession.id);
    setSelectedNodeId(newSession.nodes[0].node_id);
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    await renameSession(id, newTitle);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (selectedSessionId === id && remaining.length > 0) {
      handleSelectSession(remaining[0].id);
    }
  };

  const handleSendMessage = async (message: string, forceFailover: boolean) => {
    if (!currentSession) return;
    setIsSending(true);

    try {
      const { node, session: updatedSession } = await sendChat(
        currentSession.id,
        message,
        { forceFailover }
      );

      // Update state
      setSessions((prev) =>
        prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      );

      // Select and center new node to animate into view
      setSelectedNodeId(node.node_id);
      setCenterNodeTrigger(node.node_id + '-' + Date.now());
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing turn');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  const handleCenterNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setCenterNodeTrigger(nodeId + '-' + Date.now());
  };

  if (!currentSession) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#101013] text-[#8c8d9e]">
        Loading memory graph workspace...
      </div>
    );
  }

  const latestNode =
    currentSession.nodes.length > 0
      ? currentSession.nodes[currentSession.nodes.length - 1]
      : null;

  return (
    <div
      id="continum-ai-app"
      className="w-screen h-screen flex flex-col bg-[#14122B] text-[#EEEAF7] font-body antialiased overflow-hidden"
    >
      {/* 1. App Navigation Header */}
      <AppNavbar />

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-rose-950/90 border border-rose-600/50 text-xs text-rose-200 shadow-xl flex items-center gap-2">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-100 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Main Workspace (3 Panes + Bottom Composer Dock) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Sessions / Tasks */}
        <SessionSidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          collapsed={leftSidebarCollapsed}
          onToggleCollapse={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        />

        {/* Center Panel: Memory Graph View + Bottom Chat Composer */}
        <main className="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden bg-[#101013]">
          {/* Graph Visualization (occupies all available space) */}
          <div className="flex-1 min-h-0 relative">
            <GraphView
              session={currentSession}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
              centerNodeTrigger={centerNodeTrigger}
            />
          </div>

          {/* Chat Composer Panel under the Graph */}
          <ChatComposerPanel
            sessionId={currentSession.id}
            latestNode={latestNode}
            onSendMessage={handleSendMessage}
            isLoading={isSending}
          />
        </main>

        {/* Right Sidebar: Node Detail Panel */}
        <DetailPanel
          selectedNode={currentNode}
          allNodes={currentSession.nodes}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          onCenterNode={handleCenterNode}
          collapsed={rightSidebarCollapsed}
          onToggleCollapse={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
        />
      </div>
    </div>
  );
};
