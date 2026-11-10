import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { sanitiseReturnTo } from '../../auth/ProtectedRoute';

const MIN_PASSWORD_LENGTH = 8;

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [pending, setPending] = useState(false);
  const { signUp, status } = useAuth();
  const navigate = useNavigate();

  if (status === 'signedIn') {
    return <Navigate to={sanitiseReturnTo('/app/graph')} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCheckEmail(false);
    setPending(true);
    const res = await signUp(email, password);
    setPending(false);
    if (res.ok && res.needsConfirmation) {
      setCheckEmail(true);
      return;
    }
    if (res.ok) navigate(sanitiseReturnTo('/app/graph'), { replace: true });
    else setError(res.error || 'Could not sign up.');
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-[#F1F3F9]">Create your ContinumAI account</h1>
      {checkEmail ? (
        <p role="status" className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          Check your email to confirm your account before signing in.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
          <label className="block">
            <span className="block text-xs font-medium text-[#c0ccca]">Email address</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[#35454a] bg-[#10171a]/80 px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-[#c0ccca]">Password (min {MIN_PASSWORD_LENGTH} characters)</span>
            <input type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-[#35454a] bg-[#10171a]/80 px-3 py-2 text-sm outline-none" />
          </label>
          <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#a9dfc8] px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">
            {pending ? 'Creating account…' : 'Sign up'}
          </button>
          <p className="text-center text-xs text-[#99a9a6]">
            Already have an account? <Link to="/login" className="underline">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
};
