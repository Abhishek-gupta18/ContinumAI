import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { sanitiseReturnTo } from '../../auth/ProtectedRoute';

function useReturnTo(): string {
  const location = useLocation();
  const fromState = sanitiseReturnTo((location.state as { returnTo?: string } | null)?.returnTo);
  const fromQuery = sanitiseReturnTo(new URLSearchParams(location.search).get('returnTo'));
  return fromState !== '/app/graph' ? fromState : fromQuery;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { signIn, status } = useAuth();
  const navigate = useNavigate();
  const returnTo = useReturnTo();

  if (status === 'signedIn') {
    return <Navigate to={sanitiseReturnTo(returnTo)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn(email, password);
    setPending(false);
    if (res.ok) navigate(sanitiseReturnTo(returnTo), { replace: true });
    else setError(res.error || 'Could not sign in.');
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-[#F1F3F9]">Sign in to ContinumAI</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
        <label className="block">
          <span className="block text-xs font-medium text-[#c0ccca]">Email address</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[#35454a] bg-[#10171a]/80 px-3 py-2 text-sm outline-none" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-[#c0ccca]">Password</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-[#35454a] bg-[#10171a]/80 px-3 py-2 text-sm outline-none" />
        </label>
        <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#a9dfc8] px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-[#99a9a6]">
        New here? <Link to="/signup" className="underline">Create an account</Link>
      </p>
    </div>
  );
};
