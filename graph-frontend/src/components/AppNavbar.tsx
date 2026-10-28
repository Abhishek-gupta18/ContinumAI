import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

export const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="h-13 bg-[#14122B] border-b border-[#2A2455] px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Brand & Indicator */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
          <span className="font-display font-bold text-sm text-[#EEEAF7] tracking-tight">
            ContinumAI
          </span>
        </Link>

        {/* Live Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#14122B] border border-[#2A2455] text-xs text-[#9C98B8]">
          <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
          <span>Active relay</span>
        </div>
      </div>

      {/* Navigation tabs - sentence case */}
      <nav className="flex items-center gap-1.5">
        <Link
          to="/app"
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive('/app')
              ? 'bg-[#2A2455] text-[#EEEAF7]'
              : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/50'
          }`}
        >
          Workspace
        </Link>

        <Link
          to="/app/settings/keys"
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive('/app/settings/keys')
              ? 'bg-[#2A2455] text-[#EEEAF7]'
              : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/50'
          }`}
        >
          Provider keys
        </Link>

        <Link
          to="/app/settings/tokens"
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive('/app/settings/tokens')
              ? 'bg-[#2A2455] text-[#EEEAF7]'
              : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/50'
          }`}
        >
          Gateway tokens
        </Link>

        <Link
          to="/app/settings/account"
          className={`hidden md:inline-flex px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive('/app/settings/account')
              ? 'bg-[#2A2455] text-[#EEEAF7]'
              : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/50'
          }`}
        >
          Account & usage
        </Link>

        <Link
          to="/onboarding"
          className="hidden lg:inline-flex px-3 py-1.5 rounded-md text-xs font-medium text-[#BFD4FF] hover:text-white hover:bg-[#2A2455]/50 transition-colors"
        >
          Setup guide
        </Link>
      </nav>

      {/* Right: User Menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#14122B] border border-[#2A2455] hover:bg-[#2A2455] transition-colors"
        >
          <span className="w-5 h-5 rounded-full bg-[#2A2455] border border-[#BFD4FF]/40 flex items-center justify-center text-[10px] font-mono-code text-[#BFD4FF]">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </span>
          <span className="hidden sm:inline text-xs font-medium text-[#EEEAF7] max-w-[120px] truncate">
            {user?.name || 'Developer'}
          </span>
        </button>

        {userMenuOpen && (
          <div
            className="absolute right-0 mt-1.5 w-52 bg-[#14122B] border border-[#2A2455] rounded-md py-1 z-50"
            onMouseLeave={() => setUserMenuOpen(false)}
          >
            <div className="px-3.5 py-2 border-b border-[#2A2455]">
              <p className="text-xs font-medium text-[#EEEAF7] truncate">{user?.name}</p>
              <p className="text-[11px] text-[#9C98B8] font-mono-code truncate">{user?.email}</p>
            </div>

            <Link
              to="/app/settings/account"
              onClick={() => setUserMenuOpen(false)}
              className="block px-3.5 py-2 text-xs text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
            >
              Account settings
            </Link>

            <Link
              to="/"
              onClick={() => setUserMenuOpen(false)}
              className="block px-3.5 py-2 text-xs text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455] transition-colors"
            >
              Public landing page
            </Link>

            <div className="border-t border-[#2A2455] mt-1 pt-1">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-rose-300 hover:bg-[#2A2455] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
