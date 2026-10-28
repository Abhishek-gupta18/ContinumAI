import React from 'react';
import { Link } from 'react-router-dom';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[#14122B] border-t border-[#2A2455] text-xs text-[#9C98B8]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
              <span className="font-display font-bold text-base text-[#EEEAF7] tracking-tight">
                ContinumAI
              </span>
            </Link>
            <p className="text-xs text-[#9C98B8] leading-relaxed max-w-[36ch]">
              One memory chain across GPT, Gemini and Claude. When one model runs out of tokens, the next one continues.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-display font-bold text-[#EEEAF7] text-sm mb-3">
              Application
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/app" className="hover:text-[#EEEAF7] transition-colors">
                  Workspace
                </Link>
              </li>
              <li>
                <Link to="/onboarding" className="hover:text-[#EEEAF7] transition-colors">
                  Setup guide
                </Link>
              </li>
              <li>
                <a href="#thread-demo" className="hover:text-[#EEEAF7] transition-colors">
                  Living thread demo
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#EEEAF7] transition-colors">
                  Continuity principles
                </a>
              </li>
            </ul>
          </div>

          {/* Settings & Keys */}
          <div>
            <h4 className="font-display font-bold text-[#EEEAF7] text-sm mb-3">
              Credentials
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/app/settings/keys" className="hover:text-[#EEEAF7] transition-colors">
                  Provider keys
                </Link>
              </li>
              <li>
                <Link to="/app/settings/tokens" className="hover:text-[#EEEAF7] transition-colors">
                  Developer tokens
                </Link>
              </li>
              <li>
                <Link to="/app/settings/account" className="hover:text-[#EEEAF7] transition-colors">
                  Account settings
                </Link>
              </li>
              <li>
                <a href="#security" className="hover:text-[#EEEAF7] transition-colors">
                  Write-only model
                </a>
              </li>
            </ul>
          </div>

          {/* Auth */}
          <div>
            <h4 className="font-display font-bold text-[#EEEAF7] text-sm mb-3">
              Access
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-[#EEEAF7] transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[#EEEAF7] transition-colors">
                  Create account
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-[#EEEAF7] transition-colors">
                  Reset password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#2A2455] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            &copy; {new Date().getFullYear()} ContinumAI. Calm, persistent intelligence.
          </div>
          <div className="flex items-center gap-6 text-[#9C98B8]">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
