import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../auth';
import { AuthLayout } from '../components/AuthLayout';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signup(name, email, password);
    setSubmitting(false);
    if (res.success) navigate('/onboarding', { replace: true });
    else setError(res.error || 'Could not create your account. Please try again.');
  };

  return (
    <AuthLayout eyebrow="A little room to build" title="Start with a fresh thread." description="Create your account and bring your favorite models into one calm workspace.">
      <form onSubmit={handleSubmit} className="auth-form mt-7 space-y-4" autoComplete="on">
        {error && <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3.5 py-3 text-xs text-rose-200">{error}</p>}
        <label className="auth-field block">
          <span className="mb-1.5 block text-xs font-medium text-[#c0ccca]">Your name</span>
          <span className="relative block"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82938f]" /><input type="text" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className="auth-input w-full rounded-xl border border-[#35454a] bg-[#10171a]/80 py-3 pl-10 pr-3.5 text-sm text-[#edf3ef] placeholder:text-[#687976] outline-none transition focus:border-[#8dcdb4] focus:ring-2 focus:ring-[#8dcdb4]/15" /></span>
        </label>
        <label className="auth-field block">
          <span className="mb-1.5 block text-xs font-medium text-[#c0ccca]">Email address</span>
          <span className="relative block"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82938f]" /><input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="auth-input w-full rounded-xl border border-[#35454a] bg-[#10171a]/80 py-3 pl-10 pr-3.5 text-sm text-[#edf3ef] placeholder:text-[#687976] outline-none transition focus:border-[#8dcdb4] focus:ring-2 focus:ring-[#8dcdb4]/15" /></span>
        </label>
        <label className="auth-field block">
          <span className="mb-1.5 block text-xs font-medium text-[#c0ccca]">Password</span>
          <span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82938f]" /><input type="password" name="new-password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="auth-input w-full rounded-xl border border-[#35454a] bg-[#10171a]/80 py-3 pl-10 pr-3.5 text-sm text-[#edf3ef] placeholder:text-[#687976] outline-none transition focus:border-[#8dcdb4] focus:ring-2 focus:ring-[#8dcdb4]/15" /></span>
        </label>
        <button type="submit" disabled={submitting} className="auth-submit group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#a9dfc8] px-4 py-3 text-sm font-semibold text-[#18251f] shadow-[0_8px_28px_rgba(127,201,168,0.15)] transition hover:-translate-y-0.5 hover:bg-[#c3ecd9] disabled:cursor-wait disabled:opacity-60">
          {submitting ? 'Creating your account…' : 'Create account'} {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
        </button>
      </form>
      <p className="mt-6 border-t border-[#344247]/70 pt-5 text-center text-xs text-[#99a9a6]">Already have an account? <Link to="/login" className="font-semibold text-[#a9dfc8] transition hover:text-white">Sign in</Link></p>
    </AuthLayout>
  );
};
