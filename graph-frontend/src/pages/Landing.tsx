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
    <div className="relative min-h-screen overflow-y-auto bg-[#10131a] font-sans text-[#e3e7eb] antialiased">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,194,170,0.16),transparent_68%)]" />
      <div className="relative">
      {/* Top bar */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#8dcdb4]/15 border border-[#8dcdb4]/25 flex items-center justify-center">
            <Network className="w-4 h-4 text-[#9bd8bd]" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#f1f4f1]">ContinumAI</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#202a2e] text-[#b4e3ce] border border-[#8dcdb4]/20">
            GATEWAY
          </span>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <a href="/signup" className="hidden rounded-lg px-3 py-1.5 text-[#b4e3ce] transition hover:bg-[#202a2e] sm:inline-flex">Create account</a>
          {user ? (
            <a
              href="/demo/account"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2f2f3c] bg-[#1e1e27] px-3 py-1.5 text-[#c6c7d5] hover:bg-[#25252f]"
            >
              <UserRound className="w-3.5 h-3.5" /> {user.name}
            </a>
          ) : (
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2f2f3c] bg-[#1e1e27] px-3 py-1.5 text-[#c6c7d5] hover:bg-[#25252f]"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </a>
          )}
          <a
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#a9dfc8] px-3 py-1.5 font-medium text-[#18251f] transition-colors hover:bg-[#c3ecd9]"
          >
            Open Workspace <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#91cdb4]/30 bg-[#91cdb4]/10 px-3 py-1 text-[11px] font-mono text-[#b4e3ce]">
          <Sparkles className="w-3 h-3" /> Multi-LLM gateway · shared memory chain
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight text-[#f1f4f1]">
          One memory chain.
          <br />
          Many models.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#b0b9ba]">
          ContinumAI links every prompt, model handoff and failed-over turn into a single inspectable
          memory graph — so your agents never lose the thread, no matter which provider answers.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <a
            id="landing-open-workspace"
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-[#a9dfc8] px-5 py-2.5 text-sm font-semibold text-[#18251f] shadow-[0_8px_28px_rgba(127,201,168,0.16)] transition hover:bg-[#c3ecd9]"
          >
            Open Workspace <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/demo/keys"
            className="inline-flex items-center gap-2 rounded-lg border border-[#35434a] bg-[#1a2025]/80 px-5 py-2.5 text-sm text-[#d0dad7] transition hover:border-[#6c9a86] hover:bg-[#202a2e]"
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
              className="rounded-2xl border border-[#2b393d] bg-[#171e22]/85 p-3.5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
            >
              <Icon className="mx-auto h-4 w-4 text-[#9bd8bd]" />
              <div className="mt-1.5 font-mono text-lg font-semibold text-[#f1f4f1]">{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#93a4a2]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo pages */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9aa9a7]">
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
              className="rounded-2xl border border-[#2b393d] bg-[#171e22]/85 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#78aa91]/60 hover:bg-[#1d2729]"
            >
              <Icon className="h-4 w-4 text-[#9bd8bd]" />
              <h3 className="mt-2.5 text-sm font-semibold text-[#e2e2ec]">{title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#a0afad]">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#29343b] py-5 text-center text-[11px] text-[#89999f]">
        ContinumAI — visual memory chain &amp; decision tree explorer
      </footer>
          </div>
    </div>
  );
}
