import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    setSubmitted(true);
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
          Reset password
        </h1>
        <p className="mt-2 text-sm text-[#9C98B8] font-body max-w-[45ch]">
          Enter your email address and we will generate recovery instructions for your credentials.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#14122B] py-8 px-6 rounded-lg border border-[#2A2455] sm:px-8">
          {submitted ? (
            <div className="text-left space-y-4">
              <span className="w-8 h-8 rounded-full border border-[#BFD4FF] flex items-center justify-center glow-gemini">
                <span className="w-2 h-2 rounded-full bg-[#BFD4FF]" />
              </span>
              <h2 className="font-display font-bold text-xl text-[#EEEAF7]">
                Instructions dispatched
              </h2>
              <p className="text-sm text-[#9C98B8] font-body leading-relaxed max-w-[45ch]">
                If an account exists for <span className="font-mono-code text-[#EEEAF7]">{email}</span>, a secure password recovery message has been sent.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex px-5 py-2 rounded-full text-xs font-semibold bg-[#2A2455] text-[#EEEAF7] hover:bg-[#342d6a] transition-colors"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-full text-sm font-semibold bg-[#BFD4FF] text-[#14122B] hover:bg-white disabled:opacity-50 transition-colors mt-2"
              >
                {loading ? 'Dispatching...' : 'Send reset link'}
              </button>

              <div className="pt-4 border-t border-[#2A2455] text-center text-xs text-[#9C98B8]">
                <Link to="/login" className="text-[#BFD4FF] hover:underline font-medium">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
