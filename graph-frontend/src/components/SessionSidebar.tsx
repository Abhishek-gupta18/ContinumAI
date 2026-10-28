import React, { useState } from 'react';
import { Session } from '../types';
import {
  Search,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';

interface SessionSidebarProps {
  sessions: Session[];
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession?: () => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onDeleteSession?: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  collapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (e: React.MouseEvent, s: Session) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const saveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim() && onRenameSession) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteSession) {
      onDeleteSession(id);
    }
  };

  return (
    <aside
      id="obsidian-sessions-sidebar"
      className={`h-full flex flex-col bg-[#14122B] border-r border-[#2A2455] shrink-0 select-none text-left ${
        collapsed ? 'w-12' : 'w-72 lg:w-80'
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#2A2455] shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-sm text-[#EEEAF7] tracking-tight truncate">
                ContinumAI
              </span>
              <span className="text-[11px] text-[#9C98B8] truncate">
                Memory chain
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <button
            id="expand-sidebar-btn"
            onClick={onToggleCollapse}
            className="w-7 h-7 mx-auto rounded-full bg-[#2A2455] text-[#9C98B8] hover:text-[#EEEAF7] flex items-center justify-center transition-colors"
            title="Expand sessions"
          >
            <span className="w-2 h-2 rounded-full bg-[#BFD4FF]" />
          </button>
        )}

        {!collapsed && (
          <button
            id="collapse-sidebar-btn"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-full text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* New Session Action */}
          <div className="p-3 pb-2">
            <button
              type="button"
              onClick={onCreateSession}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New memory session</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="px-3 pb-3 border-b border-[#2A2455]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C98B8]" />
              <input
                id="search-sessions-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter sessions..."
                className="w-full bg-[#14122B] border border-[#2A2455] rounded-full pl-9 pr-3 py-1.5 text-xs text-[#EEEAF7] placeholder-[#9C98B8]/60 focus:outline-none focus:border-[#BFD4FF] transition-colors"
              />
            </div>
          </div>

          {/* Section title & count */}
          <div className="px-4 py-2.5 flex items-center justify-between text-xs font-medium text-[#9C98B8]">
            <span>Sessions ({filteredSessions.length})</span>
            <span className="text-[11px] text-[#BFD4FF]">Active relay</span>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-1">
            {filteredSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const nodeCount = session.nodes.length;
              const isBlocked = session.status === 'blocked';
              const isEditing = editingId === session.id;

              return (
                <div
                  key={session.id}
                  id={`session-item-${session.id}`}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative rounded-lg p-3 transition-colors border cursor-pointer ${
                    isSelected
                      ? 'bg-[#2A2455] border-[#BFD4FF]/40 text-[#EEEAF7]'
                      : 'bg-[#14122B] hover:bg-[#2A2455]/40 border-[#2A2455] text-[#9C98B8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-[#14122B] border border-[#BFD4FF] rounded px-2 py-0.5 text-xs text-[#EEEAF7] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => saveRename(e, session.id)}
                          className="p-1 rounded-full bg-[#BFD4FF] text-[#14122B]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-1 rounded-full bg-[#2A2455] text-[#9C98B8]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3
                          className={`text-xs font-medium leading-tight line-clamp-1 flex-1 ${
                            isSelected ? 'text-[#EEEAF7]' : 'text-[#EEEAF7]/80'
                          }`}
                        >
                          {session.title}
                        </h3>

                        {/* Inline Actions */}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => startRename(e, session)}
                            className="p-1 rounded-full text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, session.id)}
                              className="p-1 rounded-full text-rose-300 hover:bg-[#2A2455] transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-[#9C98B8] line-clamp-1 mb-2 leading-relaxed">
                    {session.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#9C98B8]">
                    <span className="font-mono-code text-[11px]">
                      {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                    </span>

                    <div className="flex items-center gap-1">
                      {isBlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-rose-500/40 text-rose-300">
                          Blocked
                        </span>
                      ) : (
                        <span className="font-mono-code text-[11px]">
                          {new Date(session.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-[#2A2455] bg-[#14122B] flex items-center justify-between text-xs text-[#9C98B8]">
          <span>Continuous memory</span>
          <span className="font-mono-code text-[11px] text-[#BFD4FF]">Active</span>
        </div>
      )}
    </aside>
  );
};
