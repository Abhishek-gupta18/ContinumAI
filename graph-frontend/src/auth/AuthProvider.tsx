import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthAction {
  ok: boolean;
  error?: string;
  /** True when the account was created but email confirmation is pending. */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<AuthAction>;
  signUp: (email: string, password: string) => Promise<AuthAction>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyMessage(code: string, fallback: string): string {
  if (code === 'invalid_credentials') return 'Wrong email or password.';
  if (code === 'user_not_found') return 'No account with this email.';
  if (code === 'over_request_rate_limit') return 'Too many attempts. Try again later.';
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!supabase) {
      // Without configuration there is nothing to load; the app shows the
      // "Supabase is not configured" screen via supabaseConfigured itself.
      setStatus('signedOut');
      return;
    }
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        const session = data.session;
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          setStatus('signedIn');
        } else {
          setUser(null);
          setStatus('signedOut');
        }
      })
      .catch(() => {
        if (alive) setStatus('signedOut');
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' });
        setStatus('signedIn');
      } else {
        setUser(null);
        setStatus('signedOut');
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthAction> => {
    if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        ok: false,
        error: friendlyMessage(error.code ?? '', error.message || 'Could not sign in.'),
      };
    }
    if (!data.session) return { ok: false, error: 'Sign-in completed but no session was returned.' };
    return { ok: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthAction> => {
    if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return {
        ok: false,
        error: friendlyMessage(error.code ?? '', error.message || 'Could not sign up.'),
      };
    }
    if (data.session) return { ok: true };
    // Email confirmation is enabled: no session yet, the user stays signed out.
    return {
      ok: true,
      needsConfirmation: true,
      error: 'Check your email to confirm your account before signing in.',
    };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) as AuthContextValue;
}
