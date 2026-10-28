import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import {
  LayoutDashboard,
  KeyRound,
  Network,
  MessageSquareCode,
  Terminal,
  Activity,
  Settings2,
  Search,
  Zap,
  Menu,
  X,
  ChevronRight,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { ToastContainer } from '../common/ToastContainer';
import { CommandPalette } from '../common/CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    metrics,
    setIsCommandPaletteOpen,
    simulateFailover,
    providers,
    addToast,
  } = useDashboard();

  const navItems = [
    {
      to: '/overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      to: '/providers',
      label: 'Providers',
      icon: <KeyRound className="w-4 h-4 shrink-0" />,
      badge: providers.filter((p) => p.isEnabled).length.toString(),
    },
    {
      to: '/graph',
      label: 'Memory Graph',
      icon: <Network className="w-4 h-4 shrink-0" />,
    },
    {
      to: '/playground',
      label: 'Playground',
      icon: <MessageSquareCode className="w-4 h-4 shrink-0" />,
    },
    {
      to: '/api-access',
      label: 'API Access',
      icon: <Terminal className="w-4 h-4 shrink-0" />,
    },
    {
      to: '/activity',
      label: 'Activity Log',
      icon: <Activity className="w-4 h-4 shrink-0" />,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings2 className="w-4 h-4 shrink-0" />,
    },
  ];

  // Helper for breadcrumbs
  const getBreadcrumbName = () => {
    const path = location.pathname;
    if (path.includes('/providers')) return 'Providers';
    if (path.includes('/graph')) return 'Memory Graph';
    if (path.includes('/playground')) return 'Playground';
    if (path.includes('/api-access')) return 'API Access';
    if (path.includes('/activity')) return 'Activity Log';
    if (path.includes('/settings')) return 'Settings';
    return 'Overview';
  };

  const handleSignOut = () => {
    addToast({
      type: 'info',
      title: 'Signed out',
      description: 'You have returned to the preview session.',
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F3F9] flex flex-col font-sans-ui selection:bg-[#7C5CFF]/30 selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 min-h-screen">
        {/* Left Sidebar (240px, collapsible) */}
        <aside
          className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#12151C] border-r border-[#232733] transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-60'
          } ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Logo Brand Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#232733]">
            {!isSidebarCollapsed ? (
              <div
                onClick={() => navigate('/overview')}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#7C5CFF]/15 border border-[#7C5CFF]/40 flex items-center justify-center relative overflow-hidden group-hover:border-[#7C5CFF] transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7C5CFF] shadow-[0_0_8px_#7C5CFF]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#7C5CFF]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm tracking-tight text-[#F1F3F9] group-hover:text-white">
                    Continum<span className="text-[#7C5CFF]">AI</span>
                  </span>
                  <span className="text-[10px] text-[#8A92A6] -mt-0.5 tracking-wider font-mono-code uppercase">
                    AI Gateway
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate('/overview')}
                className="w-7 h-7 mx-auto rounded-lg bg-[#7C5CFF]/15 border border-[#7C5CFF]/40 flex items-center justify-center cursor-pointer"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#7C5CFF] shadow-[0_0_8px_#7C5CFF]" />
              </div>
            )}

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-md text-[#8A92A6] hover:text-[#F1F3F9] hover:bg-[#181C26] transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group ${
                    isActive
                      ? 'bg-[#7C5CFF]/15 text-white border border-[#7C5CFF]/30'
                      : 'text-[#8A92A6] hover:text-[#F1F3F9] hover:bg-[#181C26]'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
                }
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="group-hover:text-[#7C5CFF] transition-colors">
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </div>
                {!isSidebarCollapsed && item.badge && (
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-[#181C26] text-[#8A92A6] border border-[#232733]">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Quick status banner inside sidebar if expanded */}
          {!isSidebarCollapsed && (
            <div className="mx-2 mb-2 p-2.5 rounded-lg bg-[#0B0D12]/80 border border-[#232733]">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#8A92A6]">Gateway health</span>
                <span className="text-[#10B981] font-mono-code font-medium">99.8%</span>
              </div>
              <div className="w-full bg-[#181C26] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#10B981] h-1.5 rounded-full w-[99.8%]" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8A92A6] mt-1.5">
                <span>{metrics.healthyCount} of {metrics.totalProviders} providers healthy</span>
              </div>
            </div>
          )}

          {/* User Profile Card (Abhishek Gupta) */}
          <div className="p-3 border-t border-[#232733] bg-[#0B0D12]/50">
            {!isSidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#3B82F6] flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm">
                    AG
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#F1F3F9] truncate">
                        Abhishek Gupta
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8A92A6] truncate font-mono-code">
                      abhishekgupta.18052006@gmail.com
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] bg-[#7C5CFF]/15 text-[#BFD4FF] border border-[#7C5CFF]/30 px-1.5 py-0.5 rounded font-mono-code">
                    Dev
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="p-1 text-[#8A92A6] hover:text-[#EF4444] rounded transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#3B82F6] flex items-center justify-center text-xs font-semibold text-white"
                  title="Abhishek Gupta (Developer)"
                >
                  AG
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1 text-[#8A92A6] hover:text-[#EF4444] rounded transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
            isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
          }`}
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-14 bg-[#12151C]/90 backdrop-blur-md border-b border-[#232733] flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-md text-[#8A92A6] hover:text-[#F1F3F9] hover:bg-[#181C26]"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-[#8A92A6]">
                <span className="hover:text-[#F1F3F9] cursor-pointer" onClick={() => navigate('/overview')}>
                  ContinumAI
                </span>
                <ChevronRight className="w-3 h-3 text-[#323849]" />
                <span className="text-[#F1F3F9] font-medium">{getBreadcrumbName()}</span>
              </div>
            </div>

            {/* Right Top Bar items */}
            <div className="flex items-center gap-2.5">
              {/* Gateway Status Pill */}
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-medium cursor-default"
                title={`${metrics.healthyCount} of ${metrics.totalProviders} providers healthy. Shared memory sync online.`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                </span>
                <span className="hidden sm:inline">Gateway online</span>
              </div>

              {/* Quick Failover simulation trigger */}
              <button
                onClick={() => simulateFailover('openai', 'gemini', 'rate_limit_error')}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs text-[#8A92A6] hover:text-[#F1F3F9] transition-colors"
                title="Simulate OpenAI hitting 429 rate limit to watch gateway switch silently to Gemini"
              >
                <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Simulate Failover</span>
              </button>

              {/* Search (Cmd+K) button */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B0D12] border border-[#232733] hover:border-[#323849] text-xs text-[#8A92A6] hover:text-[#F1F3F9] transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-block font-mono-code text-[10px] bg-[#181C26] text-[#8A92A6] px-1.5 py-0.5 rounded border border-[#232733]">
                  ⌘K
                </kbd>
              </button>
            </div>
          </header>

          {/* Page Content Viewport */}
          <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global Modals and Notifications */}
      <ToastContainer />
      <CommandPalette />
    </div>
  );
};
