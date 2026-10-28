import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#14122B]/95 backdrop-blur-md border-b border-[#2A2455]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full border border-[#BFD4FF]/40 flex items-center justify-center glow-gemini bg-[#2A2455]">
            <span className="w-2 h-2 rounded-full bg-[#BFD4FF]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg tracking-tight text-[#EEEAF7]">
              ContinumAI
            </span>
            <span className="text-xs text-[#9C98B8] font-body">
              gateway
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links - sentence case, calm */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9C98B8]">
          <a href="#thread-demo" className="hover:text-[#EEEAF7] transition-colors">
            Living thread
          </a>
          <a href="#features" className="hover:text-[#EEEAF7] transition-colors">
            Architecture
          </a>
          <a href="#how-it-works" className="hover:text-[#EEEAF7] transition-colors">
            How it works
          </a>
          <a href="#security" className="hover:text-[#EEEAF7] transition-colors">
            Key security
          </a>
          <Link to="/onboarding" className="hover:text-[#BFD4FF] transition-colors">
            Setup guide
          </Link>
        </nav>

        {/* Desktop Actions - pill buttons, no arrows */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-[#9C98B8] hover:text-[#EEEAF7] transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/app"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
          >
            Launch workspace
          </Link>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-full text-[#9C98B8] hover:text-[#EEEAF7] hover:bg-[#2A2455]"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 pt-3 pb-6 border-b border-[#2A2455] bg-[#14122B] space-y-3">
          <a
            href="#thread-demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#9C98B8] hover:text-[#EEEAF7] py-1"
          >
            Living thread
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#9C98B8] hover:text-[#EEEAF7] py-1"
          >
            Architecture
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#9C98B8] hover:text-[#EEEAF7] py-1"
          >
            How it works
          </a>
          <a
            href="#security"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#9C98B8] hover:text-[#EEEAF7] py-1"
          >
            Key security
          </a>
          <Link
            to="/onboarding"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#BFD4FF] py-1"
          >
            Setup guide
          </Link>
          <div className="pt-3 border-t border-[#2A2455] flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-sm text-[#9C98B8] hover:text-[#EEEAF7]"
            >
              Sign in
            </Link>
            <Link
              to="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B]"
            >
              Launch workspace
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
