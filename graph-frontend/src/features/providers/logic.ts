import { ApiError } from '../../api/http';
import type { PutProviderKeyBody } from '../../api/types';

export type ProviderKind = 'openai' | 'gemini' | 'claude' | 'nvidia' | 'openai_compat';

export interface ProviderKindInfo {
  kind: ProviderKind;
  label: string;
}

export const PROVIDER_KINDS: ProviderKindInfo[] = [
  { kind: 'openai', label: 'OpenAI' },
  { kind: 'gemini', label: 'Google Gemini' },
  { kind: 'claude', label: 'Anthropic Claude' },
  { kind: 'nvidia', label: 'NVIDIA NIM' },
  { kind: 'openai_compat', label: 'OpenAI-compatible (custom https base URL)' },
];

export interface ProviderFormValues {
  name: string;
  kind: ProviderKind;
  label: string;
  model: string;
  base_url: string;
  api_key: string;
  enabled: boolean;
}

export type FieldErrors = Record<string, string>;

const NAME_RE = /^[a-z0-9_-]{1,32}$/;
const MODEL_RE = /^[A-Za-z0-9._:\/-]*$/;

export function kindLabel(kind: string): string {
  return PROVIDER_KINDS.find((k) => k.kind === kind)?.label ?? kind;
}

function apiKeyError(apiKey: string): string | null {
  if (apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) {
    return 'Key must be 8-512 characters without whitespace';
  }
  return null;
}

/**
 * Client-side validation only; the server re-validates everything.
 * Empty result object = valid.
 */
export function validateForm(values: ProviderFormValues, mode: 'create' | 'edit'): FieldErrors {
  const errors: FieldErrors = {};

  if (mode === 'create' && !NAME_RE.test(values.name)) {
    errors.name = 'Name must be 1-32 lowercase letters, digits, - or _ (e.g. my-openai)';
  }

  if (values.label.length > 64 || /[\u0000-\u001f\u007f]/.test(values.label)) {
    errors.label = 'Label must be at most 64 characters without control characters';
  }

  if (values.model.length > 100 || !MODEL_RE.test(values.model)) {
    errors.model = 'Model must match /^[A-Za-z0-9._:/-]*$/ and be at most 100 characters';
  } else if (values.kind === 'openai_compat' && values.model.trim() === '') {
    errors.model = 'Model is required for OpenAI-compatible endpoints';
  }

  const apiKeyIssue = apiKeyError(values.api_key);
  if (mode === 'create') {
    if (apiKeyIssue) errors.api_key = apiKeyIssue;
  } else if (values.api_key !== '' && apiKeyIssue) {
    errors.api_key = apiKeyIssue;
  }

  if (values.kind === 'openai_compat') {
    if (values.base_url !== '') {
      if (!values.base_url.startsWith('https://')) {
        errors.base_url = 'Base URL must start with https://';
      } else if (values.base_url.length > 2048) {
        errors.base_url = 'Base URL must be at most 2048 characters';
      }
    } else if (mode === 'create') {
      errors.base_url = 'Base URL is required for OpenAI-compatible endpoints';
    }
    // edit + blank = keep the stored base URL
  } else if (values.base_url !== '') {
    errors.base_url = 'Only OpenAI-compatible endpoints use a base URL';
  }

  return errors;
}

// Mirrors the ProviderKeyRow fields the form patches against.
export interface OriginalKey {
  label: string;
  model: string;
  base_url: string | null;
  enabled: boolean;
}

export function buildPutBody(
  values: ProviderFormValues,
  mode: 'create' | 'edit',
  original?: OriginalKey,
): PutProviderKeyBody {
  const body: PutProviderKeyBody = { kind: values.kind };

  if (mode === 'create') {
    body.label = values.label;
    body.model = values.model;
    body.enabled = values.enabled;
    body.api_key = values.api_key;
    if (values.kind === 'openai_compat') {
      body.base_url = values.base_url;
    }
    return body;
  }

  if (original) {
    if (values.label !== original.label) body.label = values.label;
    if (values.model !== original.model) body.model = values.model;
    if (values.enabled !== original.enabled) body.enabled = values.enabled;
    if (values.api_key !== '') body.api_key = values.api_key; // blank = keep current key
    if (values.kind === 'openai_compat' && values.base_url !== (original.base_url ?? '')) {
      body.base_url = values.base_url;
    }
  }
  return body;
}

export function moveItem(names: string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta;
  if (index < 0 || index >= names.length || target < 0 || target >= names.length) {
    return [...names];
  }
  const out = [...names];
  const [item] = out.splice(index, 1);
  out.splice(target, 0, item);
  return out;
}

export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.type) {
      case 'limit_reached':
        return 'Provider key limit reached (maximum 10).';
      case 'unsafe_base_url':
        return 'That base URL is not allowed: only public https endpoints are accepted.';
      case 'validation':
        return err.message;
      case 'account_required':
        return 'Sign in with an account to manage provider keys.';
      case 'byok_not_configured':
        return 'Provider keys are not enabled on this server';
      case 'internal_error':
        return 'Provider key storage is unavailable.';
      case 'network':
        return err.message;
      case 'unauthorized':
        return 'Your session has expired.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : String(err);
}
