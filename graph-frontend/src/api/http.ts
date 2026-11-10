import { supabase, supabaseConfigured } from '../lib/supabase';

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;

  constructor(status: number, type: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedBurst = false;

/** Called by the app once: signs the user out and navigates to /login. */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

// Seam so tests can prove the Authorization header is attached without a live
// Supabase session. Default: the real supabase session on every call, so token
// refresh is automatic.
type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => {
  if (!supabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

// import.meta.env is populated by Vite; plain node (tests) does not have it.
const base = String(
  ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ?? ''),
).trim();
const apiBase = base === '' ? '' : base.replace(/\/+$/, '');

export interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
}

interface FullResponse<T> {
  data: T;
  headers: Headers;
}

async function requestFull<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<FullResponse<T>> {
  const headers: Record<string, string> = {};
  const token = await tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = { method, signal: options.signal, headers };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, init);
  } catch {
    throw new ApiError(0, 'network', 'Unable to reach the ContinumAI gateway.');
  }

  if (response.status === 401 && unauthorizedHandler && !unauthorizedBurst) {
    // Once per burst: sign out + navigate happens once, not per concurrent call.
    unauthorizedBurst = true;
    try {
      unauthorizedHandler();
    } finally {
      setTimeout(() => {
        unauthorizedBurst = false;
      }, 1500);
    }
  }

  if (!response.ok) {
    const parsed: unknown = await response.json().catch(() => null);
    const errorBody =
      parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>)
        ? ((parsed as Record<string, unknown>).error as Record<string, unknown> | undefined)
        : undefined;
    const message =
      errorBody && typeof errorBody.message === 'string'
        ? errorBody.message
        : `Request failed with status ${response.status}.`;
    const type =
      errorBody && typeof errorBody.type === 'string' ? errorBody.type : 'unknown_error';
    throw new ApiError(response.status, type, message);
  }

  let data: T;
  if (response.status === 204) {
    data = undefined as T;
  } else {
    try {
      data = (await response.json()) as T;
    } catch {
      throw new ApiError(
        response.status,
        'bad_response',
        'The server returned an unexpected response.',
      );
    }
  }
  return { data, headers: response.headers };
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return (await requestFull<T>(method, path, options)).data;
}

export { request as httpRequest, requestFull };
