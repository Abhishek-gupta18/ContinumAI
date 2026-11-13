import React, { useEffect, useMemo, useState } from 'react';
import { useProviderKeys } from './useProviderKeys';
import {
  kindLabel,
  validateForm,
  PROVIDER_KINDS,
  type FieldErrors,
  type ProviderFormValues,
  type ProviderKind,
} from './logic';
import type { ProviderKeyRow } from '../../api/types';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';

const MAX_KEYS = 10;

function emptyValues(kind: ProviderKind): ProviderFormValues {
  return { name: '', kind, label: '', model: '', base_url: '', api_key: '', enabled: true };
}

function toValues(row: ProviderKeyRow): ProviderFormValues {
  return {
    name: row.name,
    kind: row.kind,
    label: row.label,
    model: row.model,
    base_url: row.base_url ?? '',
    api_key: '',
    enabled: row.enabled,
  };
}

const inputClass =
  'mt-1 w-full rounded-lg border border-[#35454a] bg-[#10171a]/80 px-3 py-2 text-sm outline-none';
const buttonClass =
  'rounded-lg border border-[#232733] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#181C26] disabled:cursor-wait disabled:opacity-50';

function KeyForm({
  mode,
  original,
  existingNames,
  serverError,
  pending,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  original: ProviderKeyRow | null;
  existingNames: string[];
  serverError: string;
  pending: boolean;
  onClose: () => void;
  onSave: (values: ProviderFormValues) => void;
}) {
  const [values, setValues] = useState<ProviderFormValues>(() =>
    mode === 'edit' && original ? toValues(original) : emptyValues('openai'),
  );

  const errors: FieldErrors = useMemo(
    () => validateForm(values, mode),
    [values, mode],
  );
  // Duplicate-name check for create (server enforces it too).
  const duplicateName =
    mode === 'create' && existingNames.includes(values.name) && values.name !== '';
  const allErrors: FieldErrors = duplicateName
    ? { ...errors, name: 'A provider key with this name already exists' }
    : errors;
  const valid = Object.keys(allErrors).length === 0;

  const set = (patch: Partial<ProviderFormValues>) => setValues((v) => ({ ...v, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave(values);
    // Parent closes on success; wipe the key from local state immediately.
    setValues((v) => ({ ...v, api_key: '' }));
  };

  const isCompat = values.kind === 'openai_compat';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#232733] bg-[#12151C] p-4">
      {serverError && (
        <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          {serverError}
        </p>
      )}
      {isCompat && (
        <p className="rounded-lg border border-[#232733] bg-[#0B0D12] px-3 py-2 text-[11px] text-[#8A92A6]">
          Only public https endpoints; private and local addresses are blocked.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-medium text-[#c0ccca]">Kind</span>
          <select
            value={values.kind}
            disabled={mode === 'edit'}
            onChange={(e) => set({ kind: e.target.value as ProviderKind })}
            className={inputClass}
          >
            {PROVIDER_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-[#c0ccca]">Name</span>
          <input
            value={values.name}
            readOnly={mode === 'edit'}
            onChange={(e) => set({ name: e.target.value })}
            className={`${inputClass} ${mode === 'edit' ? 'opacity-60' : ''}`}
            placeholder="my-openai"
          />
          {allErrors.name && <span className="mt-1 block text-[11px] text-rose-300">{allErrors.name}</span>}
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-[#c0ccca]">Label</span>
          <input value={values.label} onChange={(e) => set({ label: e.target.value })} className={inputClass} placeholder="Work key (optional)" />
          {allErrors.label && <span className="mt-1 block text-[11px] text-rose-300">{allErrors.label}</span>}
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-[#c0ccca]">Model{isCompat ? '' : ' (optional)'}</span>
          <input value={values.model} onChange={(e) => set({ model: e.target.value })} className={inputClass} placeholder={isCompat ? 'required for custom endpoints' : 'default model'} />
          {allErrors.model && <span className="mt-1 block text-[11px] text-rose-300">{allErrors.model}</span>}
        </label>

        {isCompat && (
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-[#c0ccca]">Base URL</span>
            <input
              value={values.base_url}
              onChange={(e) => set({ base_url: e.target.value })}
              className={inputClass}
              placeholder="https://api.example.com/v1"
              autoComplete="off"
              inputMode="url"
            />
            {allErrors.base_url && <span className="mt-1 block text-[11px] text-rose-300">{allErrors.base_url}</span>}
          </label>
        )}

        <label className="block sm:col-span-2">
          <span className="block text-xs font-medium text-[#c0ccca]">
            API key
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={values.api_key}
            onChange={(e) => set({ api_key: e.target.value })}
            className={inputClass}
            placeholder={mode === 'edit' ? 'leave blank to keep the current key' : ''}
          />
          {allErrors.api_key && <span className="mt-1 block text-[11px] text-rose-300">{allErrors.api_key}</span>}
        </label>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="rounded bg-[#0B0D12] border-[#232733]"
          />
          Enabled (used for chat requests)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className={buttonClass}>
          Cancel
        </button>
        <button type="submit" disabled={pending || !valid} className={`${buttonClass} border-transparent bg-[#a9dfc8] text-[#18251f]`}>
          {pending ? 'Saving…' : mode === 'create' ? 'Add key' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function KeyRow({
  row,
  index,
  total,
  pending,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: {
  row: ProviderKeyRow;
  index: number;
  total: number;
  pending: boolean;
  onToggle: (enabled: boolean) => void;
  onMove: (delta: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[#232733] bg-[#12151C] p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#F1F3F9]">
          {row.name} <span className="text-xs font-normal text-[#8A92A6]">· {kindLabel(row.kind)}</span>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#8A92A6]">
          {row.label || '—'}
          {' · '}
          {row.model || 'default model'}
          {' · '}
          …{row.key_last4}
          {!row.enabled && ' · disabled'}
          {row.last_tested_at !== null && (
            <>
              {' · last tested '}
              {new Date(row.last_tested_at).toLocaleString()}
              {row.last_test_ok === false ? ' (failed)' : row.last_test_ok === true ? ' (ok)' : ''}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <label className="flex items-center gap-1.5 text-xs text-[#8A92A6]">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={`Enable ${row.name}`}
            disabled={pending}
            className="rounded bg-[#0B0D12] border-[#232733]"
          />
          <span className={row.enabled ? '' : 'opacity-50'}>Enabled</span>
        </label>
        <button aria-label={`Move ${row.name} up`} onClick={() => onMove(-1)} disabled={pending || index === 0} className={buttonClass}>
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button aria-label={`Move ${row.name} down`} onClick={() => onMove(1)} disabled={pending || index === total - 1} className={buttonClass}>
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button aria-label={`Edit ${row.name}`} onClick={onEdit} disabled={pending} className={buttonClass}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {confirming ? (
          <>
            <button
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              disabled={pending}
              className={`${buttonClass} border-transparent bg-rose-500/80 text-white`}
            >
              Confirm delete
            </button>
            <button onClick={() => setConfirming(false)} className={buttonClass}>
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button aria-label={`Delete ${row.name}`} onClick={() => setConfirming(true)} disabled={pending} className={buttonClass}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}

export function ProvidersPage(): React.ReactElement {
  const { status, pageError, rows, actionError, pending, disarm, create, update, remove, setEnabled, reorder, refresh } =
    useProviderKeys();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProviderKeyRow | null>(null);

  const atLimit = rows.length >= MAX_KEYS;
  const existingNames = rows.map((r) => r.name);

  const closeForm = () => {
    disarm();
    setFormOpen(false);
    setEditRow(null);
  };

  const handleSave = async (values: ProviderFormValues) => {
    const original = editRow
      ? { label: editRow.label, model: editRow.model, base_url: editRow.base_url, enabled: editRow.enabled }
      : undefined;
    const ok = editRow
      ? await update(editRow.name, values, original as { label: string; model: string; base_url: string | null; enabled: boolean })
      : await create(values);
    if (ok) closeForm();
  };

  // Auto-open add form when no keys exist and no error (or byok not configured)
  useEffect(() => {
    if (status === 'ready' && rows.length === 0 && !formOpen && !atLimit) {
      setFormOpen(true);
    }
    if (status === 'error' && pageError.includes('Provider keys are not enabled') && rows.length === 0 && !formOpen && !atLimit) {
      setFormOpen(true);
    }
  }, [status, pageError, rows.length, formOpen, atLimit]);

  if (status === 'loading') {
    return <p className="text-xs text-[#8A92A6]">Loading provider keys…</p>;
  }

  const byokNotConfigured = status === 'error' && pageError.includes('Provider keys are not enabled');

  if (status === 'error' && !byokNotConfigured) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-xs text-rose-300">{pageError}</p>
        <button onClick={() => void refresh()} className={buttonClass}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#232733]/60 pb-2">
        <div>
          <h1 className="text-lg font-bold text-[#F1F3F9]">Providers</h1>
          <p className="mt-0.5 text-xs text-[#8A92A6]">
            {rows.length} / {MAX_KEYS} keys
          </p>
        </div>
        <button onClick={() => { disarm(); setFormOpen(true); }} disabled={atLimit || pending} className={buttonClass}>
          <Plus className="mr-1 inline h-3.5 w-3.5" />
          Add{atLimit ? ' (limit reached)' : ''}
        </button>
      </div>

      {!formOpen && actionError && (
        <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          {actionError}
        </p>
      )}

      {formOpen && (
        <KeyForm
          mode={editRow ? 'edit' : 'create'}
          original={editRow}
          existingNames={existingNames}
          serverError={actionError}
          pending={pending}
          onClose={closeForm}
          onSave={(v) => void handleSave(v)}
        />
      )}

      {rows.length === 0 && !formOpen ? (
        <div className="rounded-xl border border-[#232733] bg-[#12151C] p-6 text-center">
          <p className="text-xs text-[#8A92A6]">
            No keys yet. Without a key, chat requests fail with &lsquo;No providers are configured for this
            account&rsquo;.
          </p>
          <button onClick={() => { disarm(); setFormOpen(true); }} disabled={atLimit || pending} className={`${buttonClass} mt-3`}>
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Add
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <KeyRow
              key={row.name}
              row={row}
              index={index}
              total={rows.length}
              pending={pending}
              onToggle={(enabled) => void setEnabled(row, enabled)}
              onMove={(delta) => void reorder(index, delta)}
              onEdit={() => {
                disarm();
                setEditRow(row);
                setFormOpen(true);
              }}
              onDelete={() => void remove(row.name)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
