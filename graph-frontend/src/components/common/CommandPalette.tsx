import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  KeyRound,
  Network,
  MessageSquareCode,
  Terminal,
  Activity,
  Settings2,
  PlusCircle,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setIsAddProviderModalOpen,
    simulateFailover,
    providers,
  } = useDashboard();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const actions = [
    {
      id: 'nav-overview',
      title: 'Go to Overview',
      subtitle: 'Metrics, provider health and quick start',
      icon: <LayoutDashboard className="w-4 h-4 text-[#7C5CFF]" />,
      action: () => {
        navigate('/overview');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-providers',
      title: 'Go to Providers',
      subtitle: 'Manage API keys and failover priority order',
      icon: <KeyRound className="w-4 h-4 text-[#10B981]" />,
      action: () => {
        navigate('/providers');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-add-provider',
      title: 'Add New Provider Key',
      subtitle: 'Configure OpenAI, Gemini, Claude, NVIDIA, or Custom',
      icon: <PlusCircle className="w-4 h-4 text-[#7C5CFF]" />,
      action: () => {
        navigate('/providers');
        setIsCommandPaletteOpen(false);
        setIsAddProviderModalOpen(true);
      },
    },
    {
      id: 'nav-graph',
      title: 'Explore Memory Graph',
      subtitle: 'Interactive Obsidian-style shared memory chains',
      icon: <Network className="w-4 h-4 text-[#3B82F6]" />,
      action: () => {
        navigate('/graph');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-playground',
      title: 'Open AI Playground',
      subtitle: 'Test automatic model failover with live chat',
      icon: <MessageSquareCode className="w-4 h-4 text-[#F97316]" />,
      action: () => {
        navigate('/playground');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-api-access',
      title: 'View API Access & Keys',
      subtitle: 'Continuum endpoint, bearer tokens, and code snippets',
      icon: <Terminal className="w-4 h-4 text-[#84CC16]" />,
      action: () => {
        navigate('/api-access');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-activity',
      title: 'Activity Log',
      subtitle: 'Detailed trace logs and error classification',
      icon: <Activity className="w-4 h-4 text-[#A78BFA]" />,
      action: () => {
        navigate('/activity');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-settings',
      title: 'Settings & Failover Policy',
      subtitle: 'Timeout limits, auth error policies, export memory',
      icon: <Settings2 className="w-4 h-4 text-[#8A92A6]" />,
      action: () => {
        navigate('/settings');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-sim-failover',
      title: 'Simulate Failover Event (OpenAI -> Gemini)',
      subtitle: 'Test how gateway silently recovers when OpenAI hits rate limit',
      icon: <Zap className="w-4 h-4 text-[#F59E0B]" />,
      action: () => {
        simulateFailover('openai', 'gemini', 'rate_limit_error');
        setIsCommandPaletteOpen(false);
        navigate('/overview');
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-[#12151C] border border-[#232733] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#232733] bg-[#0B0D12]/60">
          <Search className="w-4 h-4 text-[#8A92A6] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, or action... (e.g. providers, failover)"
            autoFocus
            className="flex-1 bg-transparent border-0 outline-none text-sm text-[#F1F3F9] placeholder-[#8A92A6]"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-[#8A92A6] hover:text-[#F1F3F9] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#232733]/50">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8A92A6]">
              No actions found matching "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-[#181C26] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#0B0D12] border border-[#232733] group-hover:border-[#323849]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#F1F3F9] group-hover:text-white">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#8A92A6]">{item.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8A92A6] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-[#232733] bg-[#0B0D12]/40 flex items-center justify-between text-[11px] text-[#8A92A6]">
          <span>Navigation & Commands</span>
          <span className="font-mono-code text-[10px] bg-[#181C26] px-1.5 py-0.5 rounded border border-[#232733]">
            ESC to close
          </span>
        </div>
      </div>
    </div>
  );
};
