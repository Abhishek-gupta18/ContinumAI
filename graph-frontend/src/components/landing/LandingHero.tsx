import React from 'react';
import { Link } from 'react-router-dom';

export const LandingHero: React.FC = () => {
  return (
    <section className="relative pt-20 pb-28 overflow-hidden sky-hero-horizon border-b border-[#2A2455]">
      {/* Subtle star-point accent at dawn/dusk */}
      <div className="absolute top-12 right-20 w-1.5 h-1.5 rounded-full bg-[#BFD4FF] glow-gemini hidden lg:block opacity-75" />
      <div className="absolute top-36 right-48 w-1 h-1 rounded-full bg-[#BFD4FF] opacity-40 hidden lg:block" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Left-aligned layout */}
        <div className="max-w-2xl text-left">
          {/* Headline: one color, Syne, tight tracking, large and confident */}
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tight text-[#EEEAF7] leading-[1.05]">
            Switch models. Keep the thought.
          </h1>

          {/* Body paragraph: under 70 chars per line, calm, precise, a little poetic */}
          <p className="mt-7 text-lg sm:text-xl text-[#EEEAF7]/90 font-body leading-relaxed max-w-[62ch]">
            ContinumAI sits in front of GPT, Gemini and Claude, using your own keys. When one runs out of tokens, the next one picks up the conversation exactly where it stopped.
          </p>

          {/* Action CTAs: pill-shaped, no arrows, sentence case */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/signup"
              className="px-7 py-3 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white transition-colors"
            >
              Start free session
            </Link>
            <a
              href="#thread-demo"
              className="px-6 py-3 rounded-full text-sm font-medium bg-[#14122B]/70 hover:bg-[#14122B] text-[#EEEAF7] border border-[#2A2455] transition-colors"
            >
              Watch the thread
            </a>
            <Link
              to="/onboarding"
              className="px-5 py-3 rounded-full text-sm font-medium text-[#BFD4FF] hover:text-white transition-colors"
            >
              Setup guide
            </Link>
          </div>

          {/* Provider presence line - calm indicator of lights taking turns */}
          <div className="mt-14 pt-8 border-t border-[#2A2455]/70 flex items-center gap-6 text-xs text-[#9C98B8]">
            <span className="text-[#EEEAF7]/80 font-medium">Active relay:</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F0A35E] glow-gpt" />
              <span>GPT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
              <span>Gemini</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E58AB0] glow-claude" />
              <span>Claude</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9BE3C4] glow-openrouter" />
              <span>OpenRouter</span>
            </div>
          </div>
        </div>
      </div>

      {/* A razor-thin last-light line at the horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#F0A35E]/60 pointer-events-none" />
    </section>
  );
};
