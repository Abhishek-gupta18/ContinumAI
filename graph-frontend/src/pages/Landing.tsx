import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  KeyRound,
  LogIn,
  Network,
  ShieldCheck,
  UserRound,
  Layers,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { MOCK_SESSIONS } from '../data/mockSessions';
import { getUser, subscribe, DemoUser } from '../auth';

export function Landing() {
  const [user, setUser] = useState<DemoUser | null>(getUser);
  useEffect(() => subscribe(() => setUser(getUser())), []);
  const nodeCount = MOCK_SESSIONS.reduce((sum, s) => sum + s.nodes.length, 0);

  return (
    <div className="min-h-screen bg-[#121218] text-[#dcddE7] font-sans antialiased overflow-y-auto">
      {/* Top bar */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Network className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#f1f1f5]">ContinumAI</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#22222b] text-indigo-300 border border-indigo-500/20">
            GATEWAY
          </span>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          {user ? (
            <a
              href="#/demo/account"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2f2f3c] bg-[#1e1e27] px-3 py-1.5 text-[#c6c7d5] hover:bg-[#25252f]"
            >
              <UserRound className="w-3.5 h-3.5" /> {user.name}
            </a>
          ) : (
            <a
              href="#/demo/signin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2f2f3c] bg-[#1e1e27] px-3 py-1.5 text-[#c6c7d5] hover:bg-[#25252f]"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </a>
          )}
          <a
            href="#/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
          >
            Open Workspace <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-mono text-indigo-300">
          <Sparkles className="w-3 h-3" /> Multi-LLM gateway · shared memory chain
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight text-[#f1f1f5]">
          One memory chain.
          <br />
          Many models.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#a0a1b5]">
          ContinumAI links every prompt, model handoff and failed-over turn into a single inspectable
          memory graph — so your agents never lose the thread, no matter which provider answers.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <a
            id="landing-open-workspace"
            href="#/app"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Open Workspace <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#/demo/keys"
            className="inline-flex items-center gap-2 rounded-lg border border-[#2f2f3c] bg-[#1b1b23] px-5 py-2.5 text-sm text-[#c6c7d5] hover:bg-[#25252f]"
          >
            <KeyRound className="w-4 h-4" /> API keys
          </a>
        </div>

        {/* Stats strip from the landing demo data */}
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-md mx-auto">
          {[
            { icon: Network, label: 'Demo sessions', value: MOCK_SESSIONS.length },
            { icon: Layers, label: 'Memory nodes', value: nodeCount },
            { icon: GitBranch, label: 'Providers', value: 3 },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-[#272733] bg-[#17171f] p-3.5 text-center"
            >
              <Icon className="mx-auto h-4 w-4 text-indigo-400" />
              <div className="mt-1.5 font-mono text-lg font-semibold text-[#f1f1f5]">{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#78798d]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo pages */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#8b8ca1]">
          Demo pages (no backend yet)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '#/demo/signin', icon: LogIn, title: 'Sign in', desc: 'Mock login, in-memory session' },
            { href: '#/demo/keys', icon: KeyRound, title: 'Provider keys', desc: 'Form only — nothing stored' },
            { href: '#/demo/tokens', icon: ShieldCheck, title: 'Gateway tokens', desc: 'Mock tokens, never saved' },
            { href: '#/demo/account', icon: UserRound, title: 'Account', desc: 'Profile from the demo session' },
          ].map(({ href, icon: Icon, title, desc }) => (
            <a
              key={href}
              href={href}
              className="rounded-xl border border-[#272733] bg-[#17171f] p-4 transition-colors hover:border-indigo-500/50 hover:bg-[#1c1c25]"
            >
              <Icon className="h-4 w-4 text-indigo-400" />
              <h3 className="mt-2.5 text-sm font-semibold text-[#e2e2ec]">{title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#78798d]">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#272733] py-5 text-center text-[11px] text-[#6e6f80]">
        ContinumAI — visual memory chain &amp; decision tree explorer
      </footer>
    </div>
  );
}
