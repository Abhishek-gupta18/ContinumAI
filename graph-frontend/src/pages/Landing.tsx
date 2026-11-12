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
import AeroShards from '../components/AeroShards';


export function Landing() {
  const [user, setUser] = useState<DemoUser | null>(getUser);

  useEffect(() => subscribe(() => setUser(getUser())), []);
  const nodeCount = MOCK_SESSIONS.reduce((sum, s) => sum + s.nodes.length, 0);

  return (
    <div className="relative min-h-screen overflow-y-auto bg-[#0e0b16] font-sans text-[#e6e1f0] antialiased">
      <div className="fixed inset-0 pointer-events-none z-0">

        <AeroShards
          shardColor="#896ABD"
          accentColor="#A855F7"
          placement="full"
          material="glass"
          markers="plus"
          count={1300}
          depthOfField={0.75}
          vignette={0.3}
          mouseInteraction
          pulseOnClick
          holdToGather
          lightMode={false}
          shardSize={1}
          spread={1}
          twist={1}
          billow={1}
          speed={1}
          scale={1}
          glow={0.35}
          grain={0.06}
          intro
          mouseStrength={0.6}
          parallax={0.5}
          paused={false}

        />


      </div>
      <div className="relative z-10">
      {/* Top bar */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#896abd]/15 border border-[#896abd]/25 flex items-center justify-center">
            <Network className="w-4 h-4 text-[#b79ae8]" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#f3f0fa]">ContinumAI</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#241d33] text-[#cbb8f0] border border-[#896abd]/20">
            GATEWAY
          </span>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <a href="/signup" className="hidden rounded-lg px-3 py-1.5 text-[#cbb8f0] transition hover:bg-[#241d33] sm:inline-flex">Create account</a>
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#a855f7] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[#bd7ef9]"
          >
            Open Workspace <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1 text-[11px] font-mono text-[#cbb8f0]">
          <Sparkles className="w-3 h-3" /> Multi-LLM gateway · shared memory chain
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight text-[#f3f0fa]">
          One memory chain.
          <br />
          Many models.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#b3aac6]">
          ContinumAI links every prompt, model handoff and failed-over turn into a single inspectable
          memory graph — so your agents never lose the thread, no matter which provider answers.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <a
            id="landing-open-workspace"
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(168,85,247,0.22)] transition hover:bg-[#bd7ef9]"
          >
            Open Workspace <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/demo/keys"
            className="inline-flex items-center gap-2 rounded-lg border border-[#3a3050] bg-[#191425]/80 px-5 py-2.5 text-sm text-[#d8d0e8] transition hover:border-[#a06fd8] hover:bg-[#241d33]"
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
              className="rounded-2xl border border-[#2e2545] bg-[#171226]/85 p-3.5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
            >
              <Icon className="mx-auto h-4 w-4 text-[#b79ae8]" />
              <div className="mt-1.5 font-mono text-lg font-semibold text-[#f3f0fa]">{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#9a8fb3]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo pages */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a8fb3]">
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
              className="rounded-2xl border border-[#2e2545] bg-[#171226]/85 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a855f7]/60 hover:bg-[#1f1833]"
            >
              <Icon className="h-4 w-4 text-[#b79ae8]" />
              <h3 className="mt-2.5 text-sm font-semibold text-[#e4def2]">{title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#a89bc2]">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#2b2342] py-5 text-center text-[11px] text-[#8f83a8]">
        ContinumAI — visual memory chain &amp; decision tree explorer
      </footer>
          </div>
    </div>
  );
}
