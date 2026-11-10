import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Accepts a user-supplied redirect target only when it is a relative path
 * starting with a single "/". Rejects protocol-relative ("//evil.com"),
 * absolute URLs and anything containing "://". Falls back to /app/graph.
 */
export function sanitiseReturnTo(raw: string | null | undefined): string {
  if (
    typeof raw === 'string' &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('://')
  ) {
    return raw;
  }
  return '/app/graph';
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p role="status">Loading…</p>;
  }
  if (status === 'signedOut') {
    const returnTo = sanitiseReturnTo(
      `${location.pathname}${location.search}${location.hash}`,
    );
    return <Navigate to="/login" state={{ returnTo }} replace />;
  }
  return <>{children}</>;
}
