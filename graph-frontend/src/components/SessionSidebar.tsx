import React, { useState } from 'react';
import { Session } from '../types';
import {
  Network,
  Search,
  CheckCircle2,
  GitBranch,
  Layers,
  ChevronRight,
  Shield,
  Clock,
} from 'lucide-react';

interface SessionSidebarProps {
  sessions: Session[];
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  collapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(
    (s) =>
      (s.title || s.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      id="obsidian-sessions-sidebar"
      className={`h-full flex flex-col bg-[#16161d] border-r border-[#272733] transition-all duration-300 ease-in-out shrink-0 select-none ${
        collapsed ? 'w-14' : 'w-72 lg:w-80'
      }`}
    >
      {/* Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-[#272733] shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-[#f1f1f5] tracking-tight truncate">
                  ContinumAI
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-[#22222b] text-indigo-300 border border-indigo-500/20">
                  GATEWAY
                </span>
              </div>
              <span className="text-[11px] text-[#78798d] truncate">
                Shared Memory Chain
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <button
            id="expand-sidebar-btn"
            onClick={onToggleCollapse}
            className="w-8 h-8 mx-auto rounded-lg bg-[#1f1f26] hover:bg-[#282834] text-[#a0a1b5] flex items-center justify-center transition-colors"
            title="Expand sessions"
          >
            <Network className="w-4 h-4 text-indigo-400" />
          </button>
        )}

        {!collapsed && (
          <button
            id="collapse-sidebar-btn"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-[#78798d] hover:text-[#d0d1df] hover:bg-[#1f1f26] transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Search bar */}
          <div className="p-3 border-b border-[#272733]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68697c]" />
              <input
                id="search-sessions-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter sessions & tasks..."
                className="w-full bg-[#1b1b20] border border-[#2a2a34] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e2e2ec] placeholder-[#68697c] focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
          </div>

          {/* Section title & count */}
          <div className="px-3 py-2 flex items-center justify-between text-[11px] font-medium text-[#737486] uppercase tracking-wider">
            <span>Sessions ({filteredSessions.length})</span>
            <span className="text-[10px] font-mono text-indigo-400">Persisted memory</span>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1.5 py-1">
            {filteredSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const nodeCount = session.node_count ?? session.nodes.length;
              const hasBranches = session.nodes.some((n) => {
                const children = session.nodes.filter((child) => child.prev_id === n.node_id);
                return children.length > 1;
              });
              const modelsUsed = Array.from(new Set(session.nodes.map((n) => n.model_used)));

              return (
                <button
                  key={session.id}
                  id={`session-item-${session.id}`}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left rounded-lg p-3 transition-all duration-150 border ${
                    isSelected
                      ? 'bg-[#1e1e27] border-indigo-500/50 shadow-sm text-[#f1f1f5]'
                      : 'bg-[#18181d] hover:bg-[#1c1c22] border-[#22222a] hover:border-[#2f2f3c] text-[#a4a5b8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <h3
                      className={`text-xs font-semibold leading-tight line-clamp-1 ${
                        isSelected ? 'text-[#f5f5fa]' : 'text-[#c8c9d8]'
                      }`}
                    >
                      {session.title || session.id}
                    </h3>
                    {session.status === 'completed' ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] text-sky-400">
                        <Clock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#7b7c8f] line-clamp-2 leading-relaxed mb-2.5">
                    {session.description || `${nodeCount} persisted nodes`}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#717284] pt-1.5 border-t border-[#23232c]">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#8b8ca2]" />
                        <span className="font-mono font-medium">{nodeCount}</span>
                      </span>

                      {hasBranches && (
                        <span
                          className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40"
                          title="Contains branching execution path"
                        >
                          <GitBranch className="w-2.5 h-2.5" />
                          <span className="text-[9px]">Forked</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {modelsUsed.map((model) => (
                        <span
                          key={model}
                          className="w-2 h-2 rounded-full bg-indigo-400"
                          title={`${model} used in memory chain`}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredSessions.length === 0 && (
              <div className="py-8 text-center text-xs text-[#6e6f80]">
                No sessions match "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer - Gateway telemetry */}
          <div className="p-3 border-t border-[#272733] bg-[#16161d] text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-[#858699]">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-indigo-400" />
                <span>Unified Gateway</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#6b6c7e]">
              <span className="flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-indigo-400" />
                <span>Session-based providers</span>
              </span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
