import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ghost,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { generateGatewayToken, getUser, listGatewayTokens, signIn, signOut, subscribe, DemoUser } from '../auth';

// Re-render on demo auth changes (sign-in/sign-out).
function useDemoUser(): DemoUser | null {
  const [user, setUser] = useState<DemoUser | null>(getUser);
  useEffect(() => subscribe(() => setUser(getUser())), []);
  return user;
}

// Shared shell: every demo page carries the "Demo, not saved" note.
function DemoPage({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#121218] font-sans text-[#dcddE7] antialiased">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-5">
        <a
          href="#/"
          className="inline-flex items-center gap-1.5 text-xs text-[#a0a1b5] hover:text-[#dcddE7]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </a>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-6 pb-16">
        <div className="rounded-xl border border-[#272733] bg-[#17171f] p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-600/20">
              <Icon className="h-4 w-4 text-indigo-400" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-[#f1f1f5]">{title}</h1>
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Demo, not saved — no backend for this page yet. Nothing you type here is stored or sent
            anywhere.
          </p>

          {children}
        </div>
      </main>
    </div>
  );
}

const fieldClass =
  'w-full rounded-lg border border-[#2f2f3c] bg-[#1b1b23] px-3 py-2 text-xs text-[#e2e2ec] placeholder-[#68697c] focus:border-indigo-500/60 focus:outline-none';
const submitClass =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';

export function SignInDemo() {
  const [email, setEmail] = useState('');
  const user = useDemoUser();

  if (user) {
    return (
      <DemoPage title="Sign in" icon={LogIn}>
        <p className="mt-4 text-xs text-[#a0a1b5]">
          Demo session active as <span className="font-mono text-[#e2e2ec]">{user.email}</span>.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#2f2f3c] bg-[#1e1e27] px-3 py-2 text-xs text-[#c6c7d5] hover:bg-[#25252f]"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out of demo session
        </button>
      </DemoPage>
    );
  }

  return (
    <DemoPage title="Sign in" icon={LogIn}>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            signIn(email.trim());
          }}
        >
        <input
          id="demo-signin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldClass}
        />
        <input
          id="demo-signin-password"
          type="password"
          placeholder="Password (ignored in demo)"
          className={fieldClass}
        />
        <button id="demo-signin-submit" type="submit" className={submitClass}>
          <LogIn className="h-3.5 w-3.5" /> Sign in (demo)
        </button>
      </form>
    </DemoPage>
  );
}

// Provider keys are NEVER stored — submitted values are discarded immediately.
export function ProviderKeysDemo() {
  const [key, setKey] = useState('');
  const [discarded, setDiscarded] = useState(false);

  return (
    <DemoPage title="Provider keys" icon={KeyRound}>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setKey(''); // discarded immediately — nothing persisted, nothing sent
          setDiscarded(true);
        }}
      >
        <p className="text-xs text-[#a0a1b5]">OpenAI, Gemini or Anthropic API key.</p>
        <input
          id="demo-provider-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-... (demo only, discarded on submit)"
          autoComplete="off"
          className={fieldClass}
        />
        <button id="demo-provider-key-submit" type="submit" className={submitClass}>
          <KeyRound className="h-3.5 w-3.5" /> Save key (demo)
        </button>
        {discarded && (
          <p className="text-[11px] text-emerald-300">
            Key discarded — this is a demo page and nothing was stored.
          </p>
        )}
      </form>
    </DemoPage>
  );
}

export function GatewayTokensDemo() {
  const [tokens, setTokens] = useState<string[]>(() => listGatewayTokens());

  return (
    <DemoPage title="Gateway tokens" icon={ShieldCheck}>
      <p className="mt-4 text-xs text-[#a0a1b5]">
        Tokens are fake, in-memory only, and reset when the page reloads.
      </p>
      <div className="mt-4 space-y-2">
        {tokens.map((token) => (
          <div
            key={token}
            className="flex items-center justify-between rounded-lg border border-[#2f2f3c] bg-[#1b1b23] px-3 py-2"
          >
            <span className="font-mono text-[11px] text-[#c6c7d5]">{token}</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-300">Demo</span>
          </div>
        ))}
        {tokens.length === 0 && (
          <p className="flex items-center gap-2 text-xs text-[#68697c]">
            <Ghost className="h-3.5 w-3.5" /> No demo tokens yet.
          </p>
        )}
      </div>
      <button
        id="demo-token-generate"
        type="button"
        onClick={() => {
          generateGatewayToken();
          setTokens(listGatewayTokens());
        }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
      >
        <Plus className="h-3.5 w-3.5" /> Generate token (demo)
      </button>
    </DemoPage>
  );
}

export function AccountDemo() {
  const user = useDemoUser();

  if (!user) {
    return (
      <DemoPage title="Account" icon={UserRound}>
        <p className="mt-4 text-xs text-[#a0a1b5]">No demo session. Sign in on the demo page first.</p>
        <a
          href="#/demo/signin"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <LogIn className="h-3.5 w-3.5" /> Go to demo sign in
        </a>
      </DemoPage>
    );
  }

  return (
    <DemoPage title="Account" icon={UserRound}>
      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-[#2f2f3c] bg-[#1b1b23] px-3 py-2">
          <dt className="text-[#78798d]">Name</dt>
          <dd className="text-[#e2e2ec]">{user.name}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#2f2f3c] bg-[#1b1b23] px-3 py-2">
          <dt className="text-[#78798d]">Email</dt>
          <dd className="font-mono text-[#e2e2ec]">{user.email}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#2f2f3c] bg-[#1b1b23] px-3 py-2">
          <dt className="text-[#78798d]">Plan</dt>
          <dd className="text-[#e2e2ec]">Demo</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#2f2f3c] bg-[#1e1e27] px-3 py-2 text-xs text-[#c6c7d5] hover:bg-[#25252f]"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out of demo session
      </button>
    </DemoPage>
  );
}
