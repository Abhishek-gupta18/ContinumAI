// DEMO ONLY — auth has no backend yet.
// Session and gateway tokens live in memory until reload; nothing is persisted
// or sent anywhere. Provider keys are never stored anywhere, not even in memory.

import { useSyncExternalStore } from 'react';

export interface DemoUser {
  name: string;
  email: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let user: DemoUser | null = null;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getUser(): DemoUser | null {
  return user;
}

export function signIn(email: string, name?: string): DemoUser {
  user = { name: name || email.split('@')[0] || 'Demo User', email };
  listeners.forEach((fn) => fn());
  return user;
}

export function signOut(): void {
  user = null;
  listeners.forEach((fn) => fn());
}

function validateEmail(email?: string): string | undefined {
  if (!email || !email.includes('@')) return 'Please enter a valid email address';
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface AuthResult {
  success: boolean;
  error?: string;
}

// Demo gateway tokens — fake, in-memory, reset on reload.
const gatewayTokens: string[] = [];

export function listGatewayTokens(): string[] {
  return gatewayTokens;
}

export function generateGatewayToken(): string {
  const token = 'gw_demo_' + Math.random().toString(36).slice(2, 12);
  gatewayTokens.push(token);
  return token;
}

export function useAuth() {
  const current = useSyncExternalStore(subscribe, getUser);
  return {
    user: current,
    isAuthenticated: !!current,
    isLoading: false,
    login: async (email: string, _password?: string): Promise<AuthResult> => {
      const error = validateEmail(email);
      if (error) return { success: false, error };
      await delay(400);
      signIn(email);
      return { success: true };
    },
    signup: async (name: string, email: string, _password?: string): Promise<AuthResult> => {
      if (!name.trim()) return { success: false, error: 'Name is required' };
      const error = validateEmail(email);
      if (error) return { success: false, error };
      await delay(400);
      signIn(email, name);
      return { success: true };
    },
    logout: signOut,
    resetPassword: async (email: string): Promise<AuthResult> => {
      const error = validateEmail(email);
      if (error) return { success: false, error };
      await delay(400);
      return { success: true };
    },
  };
}
