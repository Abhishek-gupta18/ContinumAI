import React from 'react';
import { ArrowLeft, Network, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-scene relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-[#e3e7eb] sm:px-6">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <Link to="/" className="auth-back absolute left-5 top-5 inline-flex items-center gap-2 text-xs text-[#a0afad] transition hover:text-[#d9ebe2] sm:left-8 sm:top-8">
        <ArrowLeft className="h-3.5 w-3.5" /> Back home
      </Link>
      <section className="auth-card relative z-10 w-full max-w-[440px] rounded-[28px] border border-[#344247]/80 bg-[#151d21]/90 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-9">
        <Link to="/" className="auth-brand inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#8dcdb4]/25 bg-[#8dcdb4]/10 text-[#a9dfc8]">
            <Network className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-[#f1f4f1]">ContinumAI</span>
          <span className="ml-1 rounded-full border border-[#8dcdb4]/20 bg-[#8dcdb4]/10 px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-[#b4e3ce]">Gateway</span>
        </Link>
        <div className="mt-8">
          <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9bd8bd]"><Sparkles className="h-3 w-3" /> {eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#f1f4f1]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#aab8b7]">{description}</p>
        </div>
        {children}
      </section>
      <p className="absolute bottom-5 text-center text-[10px] text-[#70817e]">Your models, working together. Your keys stay yours.</p>
    </main>
  );
}
