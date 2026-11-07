const express = require('express');

const NAME_RE = /^[a-z0-9_-]{1,32}$/;
const MODEL_RE = /^[A-Za-z0-9._:\/-]*$/;
const KINDS = ['openai', 'gemini', 'claude', 'nvidia', 'openai_compat'];

const RESP_FIELDS = ['name', 'kind', 'label', 'model', 'base_url', 'key_last4', 'priority', 'enabled', 'last_tested_at', 'last_test_ok', 'created_at', 'updated_at'];

const nowIso = () => new Date().toISOString();

function publicRow(row) {
  const out = {};
  for (const f of RESP_FIELDS) {
    out[f] = row[f] ?? (f === 'base_url' ? null : f === 'last_test_ok' ? null : '');
  }
  out.label = row.label ?? '';
  out.model = row.model ?? '';
  out.base_url = row.base_url ?? null;
  out.last_tested_at = row.last_tested_at ?? null;
  out.last_test_ok = row.last_test_ok ?? null;
  if (out.priority === undefined) out.priority = row.priority;
  return out;
}

function createProviderKeysRouter({ keyStore, keyVault, ssrfGuard }) {
  const router = express.Router();

  function notConfigured(res) {
    if (keyStore === null || keyStore === undefined || keyVault === null || keyVault === undefined) {
      return res.status(501).json({
        error: { type: 'byok_not_configured', message: 'Provider key storage is not configured' },
      });
    }
    return null;
  }

  function accountRequired(req, res) {
    if (req.user.id === null) {
      return res.status(403).json({
        error: { type: 'account_required', message: 'Sign in with an account to manage provider keys' },
      });
    }
    return null;
  }

  function validation(res, message) {
    return res.status(400).json({ error: { type: 'validation', message } });
  }

  function encryptKey(userId, name, apiKey, existingCiphertext, existingLast4) {
    return {
      key_ciphertext: apiKey !== undefined
        ? keyVault.encrypt(apiKey, `${userId}:${name}`)
        : existingCiphertext,
      key_last4: apiKey !== undefined
        ? apiKey.slice(-4)
        : existingLast4,
    };
  }

  async function validateBaseUrl(baseUrl) {
    try {
      return await ssrfGuard(baseUrl);
    } catch (err) {
      const e = new Error('base_url is not allowed');
      e.status = 400;
      e.type = 'unsafe_base_url';
      e.reason = err.reason;
      throw e;
    }
  }

  router.get('/providers', async (req, res) => {
    const guard = notConfigured(res);
    if (guard) return guard;
    if (accountRequired(req, res)) return;
    try {
      const rows = await keyStore.list(req.user.id);
      return res.status(200).json({ providers: rows.map(publicRow) });
    } catch (err) {
      console.error('[provider-keys] list failed:', err.message);
      return res.status(503).json({ error: { type: 'internal_error', message: 'Provider key storage is unavailable' } });
    }
  });

  router.put('/providers/:name', async (req, res) => {
    const guard = notConfigured(res);
    if (guard) return guard;
    if (accountRequired(req, res)) return;
    const userId = req.user.id;
    const name = req.params.name;
    if (!NAME_RE.test(name)) {
      return validation(res, 'Invalid provider name');
    }
    const body = req.body;
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return validation(res, 'Body must be an object');
    }

    const kind = body.kind;
    if (!KINDS.includes(kind)) {
      return validation(res, `kind must be one of: ${KINDS.join(', ')}`);
    }

    // label, model, base_url, priority, enabled, apiKey - validate only if provided
    let label;
    if (body.label !== undefined) {
      if (typeof body.label !== 'string' || body.label.length > 64 || /[\u0000-\u001f\u007f]/.test(body.label)) {
        return validation(res, 'label must be a string of at most 64 characters without control characters');
      }
      label = body.label;
    }

    let model;
    if (body.model !== undefined) {
      if (typeof body.model !== 'string' || body.model.length > 100 || !MODEL_RE.test(body.model)) {
        return validation(res, 'model must match /^[A-Za-z0-9._:\/-]*$/ and be at most 100 characters');
      }
      model = body.model;
    }

    let priority;
    if (body.priority !== undefined) {
      if (!Number.isInteger(body.priority) || body.priority < 1 || body.priority > 100000) {
        return validation(res, 'priority must be an integer between 1 and 100000');
      }
      priority = body.priority;
    }

    let enabled;
    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') {
        return validation(res, 'enabled must be a boolean');
      }
      enabled = body.enabled;
    }

    let apiKey;
    if (body.api_key !== undefined) {
      if (typeof body.api_key !== 'string' || body.api_key.length < 8 || body.api_key.length > 512 || /\s/.test(body.api_key)) {
        return validation(res, 'api_key must be a string of 8-512 characters without whitespace');
      }
      apiKey = body.api_key;
    }

    let normalizedBaseUrl = null;
    const hasBaseUrl = body.base_url !== undefined && body.base_url !== null;
    if (kind === 'openai_compat') {
      if (!hasBaseUrl) {
        // on update, absent base_url keeps the stored one; on create it's required
      } else if (typeof body.base_url !== 'string') {
        return validation(res, 'base_url must be a string');
      }
    } else if (hasBaseUrl) {
      return validation(res, `base_url is not allowed for kind ${kind}`);
    }

    try {
      const existing = await keyStore.get(userId, name);

      // normalize base_url: if provided, validate; if absent on update, keep existing
      if (kind === 'openai_compat') {
        if (hasBaseUrl) {
          normalizedBaseUrl = await validateBaseUrl(body.base_url);
        } else if (existing) {
          normalizedBaseUrl = existing.base_url;
        } else {
          return validation(res, 'base_url is required for kind openai_compat');
        }
      }

      if (existing) {
        if (existing.kind !== kind) {
          return validation(res, 'kind cannot be changed for an existing provider key');
        }
        const { key_ciphertext, key_last4 } = encryptKey(userId, name, apiKey, existing.key_ciphertext, existing.key_last4);
        if (apiKey !== undefined && (key_ciphertext === null || key_ciphertext === undefined)) {
          return validation(res, 'api_key is required when creating a provider key');
        }
        const patch = {
          label: label !== undefined ? label : existing.label,
          model: model !== undefined ? model : existing.model,
          base_url: normalizedBaseUrl,
          priority: priority !== undefined ? priority : existing.priority,
          enabled: enabled !== undefined ? enabled : existing.enabled,
          key_ciphertext,
          key_last4,
        };
        const row = await keyStore.update(userId, name, patch);
        if (row === null) {
          return res.status(404).json({ error: { type: 'not_found', message: 'Provider not found' } });
        }
        return res.status(200).json({ provider: publicRow(row) });
      }

      if (apiKey === undefined || typeof apiKey !== 'string') {
        return validation(res, 'api_key is required when creating a provider key');
      }
      const rows = await keyStore.list(userId);
      if (rows.length >= 10) {
        return res.status(400).json({
          error: { type: 'limit_reached', message: 'At most 10 provider keys per user' },
        });
      }
      const highest = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.priority));
      const newPriority = priority === undefined ? Math.min(highest + 10, 100000) : priority;
      const { key_ciphertext, key_last4 } = encryptKey(userId, name, apiKey, null, null);
      if (!key_ciphertext) {
        return validation(res, 'api_key is required when creating a provider key');
      }
      const created = await keyStore.insert(userId, {
        name,
        kind,
        label: label === undefined ? '' : label,
        key_ciphertext,
        key_last4,
        model: model === undefined ? '' : model,
        base_url: normalizedBaseUrl,
        priority: newPriority,
        enabled: enabled === undefined ? true : enabled,
        last_tested_at: null,
        last_test_ok: null,
      });
      return res.status(201).json({ provider: publicRow(created) });
    } catch (err) {
      if (err && err.type === 'unsafe_base_url') {
        return res.status(400).json({ error: { type: 'unsafe_base_url', message: 'base_url is not allowed' } });
      }
      if (err && err.code === 'exists') {
        return validation(res, 'A provider key with this name already exists');
      }
      console.error('[provider-keys] put failed:', err.message);
      return res.status(503).json({ error: { type: 'internal_error', message: 'Provider key storage is unavailable' } });
    }
  });

  router.delete('/providers/:name', async (req, res) => {
    const guard = notConfigured(res);
    if (guard) return guard;
    if (accountRequired(req, res)) return;
    const name = req.params.name;
    if (!NAME_RE.test(name)) {
      return validation(res, 'Invalid provider name');
    }
    try {
      const removed = await keyStore.remove(req.user.id, name);
      if (!removed) {
        return res.status(404).json({ error: { type: 'not_found', message: 'Provider not found' } });
      }
      return res.status(204).send();
    } catch (err) {
      console.error('[provider-keys] delete failed:', err.message);
      return res.status(503).json({ error: { type: 'internal_error', message: 'Provider key storage is unavailable' } });
    }
  });

  router.put('/provider-order', async (req, res) => {
    const guard = notConfigured(res);
    if (guard) return guard;
    if (accountRequired(req, res)) return;
    const body = req.body;
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return validation(res, 'Body must be an object');
    }
    const order = body.order;
    if (!Array.isArray(order) || order.some((n) => typeof n !== 'string' || !NAME_RE.test(n))) {
      return validation(res, 'order must be an array of provider names');
    }
    const saw = new Set();
    for (const n of order) {
      if (saw.has(n)) {
        return validation(res, 'order must contain every provider name exactly once');
      }
      saw.add(n);
    }
    try {
      const rows = await keyStore.list(req.user.id);
      const names = rows.map((r) => r.name);
      if (order.length !== names.length || order.some((n) => !names.includes(n))) {
        return validation(res, 'order must contain every one of your provider names exactly once');
      }
      await keyStore.setOrder(req.user.id, order);
      const updated = await keyStore.list(req.user.id);
      return res.status(200).json({ providers: updated.map(publicRow) });
    } catch (err) {
      if (err && err.message === 'unknown_name') {
        return validation(res, 'order must contain every provider name exactly once');
      }
      console.error('[provider-keys] order failed:', err.message);
      return res.status(503).json({ error: { type: 'internal_error', message: 'Provider key storage is unavailable' } });
    }
  });

  return router;
}

module.exports = { createProviderKeysRouter };
