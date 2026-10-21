// DEMO ONLY — auth has no backend yet.
// Session and gateway tokens live in memory until reload; nothing is persisted
// or sent anywhere. Provider keys are never stored anywhere, not even in memory.

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

export function signIn(email: string): DemoUser {
  user = { name: email.split('@')[0] || 'Demo User', email };
  listeners.forEach((fn) => fn());
  return user;
}

export function signOut(): void {
  user = null;
  listeners.forEach((fn) => fn());
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
