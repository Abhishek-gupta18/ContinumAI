import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { getMe } from '../../api/endpoints';
import { Me } from '../../api/types';

export function AccountPage(): React.ReactElement {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((res) => {
        if (alive) setMe(res);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message || 'Could not load account details.');
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-lg font-bold">Account</h1>
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
      <dl className="space-y-2 text-xs">
        <div className="rounded-lg border border-[#232733] bg-[#12151C] p-3">
          <dt className="text-[#8A92A6]">Email</dt>
          <dd className="break-all">{user?.email ?? ''}</dd>
        </div>
        <div className="rounded-lg border border-[#232733] bg-[#12151C] p-3">
          <dt className="text-[#8A92A6]">User id (GET /me)</dt>
          <dd className="break-all font-mono-code">{me?.id ?? (me ? 'null' : '…')}</dd>
        </div>
      </dl>
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-[#232733] px-3 py-2 text-xs font-semibold hover:bg-[#181C26]"
      >
        Logout
      </button>
    </div>
  );
}
