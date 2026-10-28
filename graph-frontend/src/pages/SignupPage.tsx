import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('Abhishek Gupta');
  const [email, setEmail] = useState('abhishekgupta.18052006@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
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

    if (res.success) {
      navigate('/onboarding', { replace: true });
    } else {
      setError(res.error || 'Failed to create account');
    }
  };

  return (
    <div className="min-h-screen bg-[#14122B] text-[#EEEAF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-left px-4 sm:px-0">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BFD4FF] glow-gemini" />
          <span className="font-display font-bold text-lg text-[#EEEAF7] tracking-tight">
            ContinumAI
          </span>
        </Link>
        <h1 className="font-display font-bold text-3xl text-[#EEEAF7] tracking-tight">
          Create developer account
        </h1>
        <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[45ch]">
          Configure your unified memory relay across OpenAI, Gemini, and Claude.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#14122B] py-8 px-6 rounded-lg border border-[#2A2455] sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-md bg-[#2A2455] border border-rose-500/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-sm text-[#EEEAF7] focus:outline-none focus:border-[#BFD4FF] transition-colors"
                placeholder="Ada Lovelace"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-sm text-[#EEEAF7] focus:outline-none focus:border-[#BFD4FF] transition-colors"
                placeholder="developer@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9C98B8] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md bg-[#14122B] border border-[#2A2455] text-sm text-[#EEEAF7] focus:outline-none focus:border-[#BFD4FF] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white disabled:opacity-50 transition-colors mt-4"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#2A2455] text-center text-xs text-[#9C98B8]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#BFD4FF] hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
