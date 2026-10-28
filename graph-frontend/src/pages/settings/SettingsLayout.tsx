import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { AppNavbar } from '../../components/AppNavbar';
import { ArrowLeft } from 'lucide-react';

export const SettingsLayout: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col bg-[#14122B] text-[#EEEAF7] font-body antialiased overflow-hidden">
      <AppNavbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Left Sidebar */}
        <aside className="w-60 bg-[#14122B] border-r border-[#2A2455] p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <div className="pb-2 border-b border-[#2A2455]">
              <span className="text-xs font-medium text-[#9C98B8]">
                Settings
              </span>
            </div>

            <nav className="space-y-1">
              <NavLink
                to="/app/settings/keys"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2A2455] text-[#EEEAF7]'
                      : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/40'
                  }`
                }
              >
                <span className="w-2 h-2 rounded-full bg-[#F0A35E] glow-gpt" />
                <span>Provider keys</span>
              </NavLink>

              <NavLink
                to="/app/settings/tokens"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2A2455] text-[#EEEAF7]'
                      : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/40'
                  }`
                }
              >
                <span className="w-2 h-2 rounded-full bg-[#BFD4FF] glow-gemini" />
                <span>Gateway tokens</span>
              </NavLink>

              <NavLink
                to="/app/settings/account"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2A2455] text-[#EEEAF7]'
                      : 'text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]/40'
                  }`
                }
              >
                <span className="w-2 h-2 rounded-full bg-[#E58AB0] glow-claude" />
                <span>Account & usage</span>
              </NavLink>
            </nav>
          </div>

          <div className="pt-4 border-t border-[#2A2455]">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 text-xs font-medium text-[#9C98B8] hover:text-[#EEEAF7] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to workspace</span>
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#14122B] p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
