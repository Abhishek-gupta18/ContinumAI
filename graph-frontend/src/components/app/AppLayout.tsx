import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { ToastViewport } from './toast';

const NAV_ITEMS = [
  { to: '/app/graph', label: 'Graph' },
  { to: '/app/playground', label: 'Playground' },
  { to: '/app/providers', label: 'Providers' },
  { to: '/app/api-access', label: 'API Access' },
  { to: '/app/account', label: 'Account' },
];

export function AppLayout(): React.ReactElement {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const links = (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm ${
              isActive
                ? 'bg-[#7C5CFF]/15 font-semibold text-white'
                : 'text-[#8A92A6] hover:text-[#F1F3F9]'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen flex-col bg-[#0B0D12] text-[#F1F3F9]">
      <header className="flex items-center justify-between border-b border-[#232733] px-4 py-3">
        <button
          className="lg:hidden"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-sm font-bold">ContinumAI</span>
        <div className="flex items-center gap-3 text-xs text-[#8A92A6]">
          <span className="max-w-[40vw] truncate sm:max-w-none">{user?.email ?? ''}</span>
          <button
            onClick={handleSignOut}
            aria-label="Log out"
            className="flex items-center gap-1.5 rounded-lg border border-[#232733] px-2.5 py-1.5 hover:bg-[#181C26]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 border-r border-[#232733] p-3 lg:block">
          {links}
        </aside>
        {mobileOpen && (
          <aside className="absolute inset-y-0 left-0 top-[53px] z-40 w-48 border-r border-[#232733] bg-[#0B0D12] p-3 lg:hidden">
            {links}
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
