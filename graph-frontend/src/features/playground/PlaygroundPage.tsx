import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Send } from 'lucide-react';
import { usePlayground } from './usePlayground';
import type { ChatMessage } from './logic';

const textareaClass =
  'w-full resize-y rounded-lg border border-[#35454a] bg-[#10171a]/80 px-3 py-2 text-sm outline-none';
const controlClass =
  'rounded-lg border border-[#232733] bg-[#12151C] px-2.5 py-1.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-50';

function Composer({
  providers,
  sending,
  invalidMessage,
  onSend,
}: {
  providers: string[];
  sending: boolean;
  invalidMessage: string;
  onSend: (text: string, provider: string | null) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('');

  const submit = async () => {
    // Clear the box only when the gateway accepted the message.
    const ok = await onSend(text, provider === '' ? null : provider);
    if (ok) setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() !== '' && !sending) void submit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={2}
          placeholder="Enter to send, Shift+Enter for a new line"
          className={textareaClass}
        />
        <button onClick={() => void submit()} disabled={sending || text.trim() === ''} className={`${controlClass} border-transparent bg-[#a9dfc8] text-[#18251f]`}>
          <Send className="mr-1 inline h-3.5 w-3.5" />
          {sending ? 'Sending…' : 'Send'}
        </button>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={sending}
          className={controlClass}
          aria-label="Provider"
        >
          <option value="">Auto (use my key order)</option>
          {providers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {invalidMessage && <p role="alert" className="text-[11px] text-rose-300">{invalidMessage}</p>}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p
          className="max-w-[85%] whitespace-pre-wrap rounded-xl border border-[#232733] bg-[#7C5CFF]/15 px-3.5 py-2.5 text-xs text-[#F1F3F9]"
        >
          {message.text}
        </p>
      </div>
    );
  }
  if (message.role === 'assistant') {
    return (
      <div className="max-w-[85%] self-start rounded-xl border border-[#232733] bg-[#12151C] px-3.5 py-2.5">
        <p className="whitespace-pre-wrap text-xs text-[#F1F3F9]">{message.text}</p>
        <p className="mt-1 text-[10px] text-[#8A92A6]">
          {message.model}
          {message.provider ? ` · ${message.provider}` : ''}
          {message.failedProviders && message.failedProviders.length > 0
            ? ` · failed over from: ${message.failedProviders.join(', ')}`
            : ''}
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-[85%] self-start rounded-xl border border-rose-400/30 bg-rose-400/10 px-3.5 py-2.5">
      <p className="whitespace-pre-wrap text-xs text-rose-200">{message.text}</p>
      {message.failedProviders && message.failedProviders.length > 0 && (
        <p className="mt-1 text-[10px] text-rose-300/80">
          failed: {message.failedProviders.join(', ')}
        </p>
      )}
    </div>
  );
}

export function PlaygroundPage(): React.ReactElement {
  const {
    status,
    pageError,
    sessions,
    providers,
    selectedId,
    messages,
    pendingText,
    nodesLoading,
    nodesError,
    sending,
    sendError,
    warning,
    invalidMessage,
    selectSession,
    newSession,
    send,
    retryLoad,
    clearSendError,
  } = usePlayground();

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  if (status === 'loading') {
    return <p className="text-xs text-[#8A92A6]">Loading sessions…</p>;
  }
  if (status === 'error') {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-xs text-rose-300">{pageError}</p>
        <button onClick={retryLoad} className={controlClass}>Retry</button>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-4">
      {/* Session list */}
      <div className="flex max-h-[70vh] flex-col rounded-xl border border-[#232733] bg-[#12151C] lg:col-span-1">
        <div className="flex items-center justify-between border-b border-[#232733] p-3">
          <span className="text-xs font-semibold text-[#F1F3F9]">Sessions</span>
          <button onClick={newSession} className={controlClass}>
            <Plus className="mr-1 inline h-3 w-3" />
            New session
          </button>
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {sessions.map((s) => {
            const isCurrent = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                disabled={sending}
                className={`w-full rounded-lg p-2 text-left text-xs ${
                  isCurrent
                    ? 'border border-[#7C5CFF]/40 bg-[#7C5CFF]/15 font-semibold text-white'
                    : 'border border-[#232733] bg-[#0B0D12] text-[#8A92A6] hover:text-[#F1F3F9]'
                }`}
              >
                <span className="block truncate">{s.title || s.id}</span>
                <span className="text-[10px]">{s.node_count} nodes</span>
              </button>
            );
          })}
          {sessions.length === 0 && (
            <p className="p-2 text-[11px] text-[#8A92A6]">No sessions yet. Start a New session and send a message.</p>
          )}
        </div>
      </div>

      {/* Thread + composer */}
      <div className="flex max-h-[70vh] min-h-0 flex-col rounded-xl border border-[#232733] bg-[#12151C] lg:col-span-3">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          {providers.length === 0 && (
            <p className="rounded-lg border border-[#232733] bg-[#0B0D12] px-3 py-2 text-[11px] text-[#8A92A6]">
              Add a provider key first.{' '}
              <Link to="/app/providers" className="underline">
                /app/providers
              </Link>
            </p>
          )}
          {sendError && (
            <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
              {sendError.message}{' '}
              {sendError.action === 'add_key' && (
                <Link to="/app/providers" className="underline">
                  Add a key
                </Link>
              )}
              {sendError.action === 'retry' && (
                <>
                  <button onClick={clearSendError} className="underline">
                    Dismiss
                  </button>{' '}
                  <span className="text-rose-200/80">Your message is still in the box.</span>
                </>
              )}
            </p>
          )}
          {warning && (
            <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              {warning}
            </p>
          )}
          {nodesLoading ? (
            <p className="text-xs text-[#8A92A6]">Loading memory chain…</p>
          ) : nodesError ? (
            <p role="alert" className="text-xs text-rose-300">{nodesError}</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-[#8A92A6]">Send a first message to start the memory chain.</p>
          ) : (
            messages.map((m) => <MessageBubble key={`${m.id}-${m.text.slice(0, 12)}`} message={m} />)
          )}
          {pendingText !== null && (
            <>
              <div className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-xl border border-[#232733] bg-[#7C5CFF]/15 px-3.5 py-2.5 text-xs text-[#F1F3F9]">
                  {pendingText}
                </p>
              </div>
              <p className="self-start text-[10px] text-[#8A92A6]">Sending…</p>
            </>
          )}
          {selectedSession === null && selectedId !== '' && !nodesLoading && (
            <p className="text-[10px] text-[#8A92A6]">
              New session ({selectedId}); nothing is stored on the server until you send a message.
            </p>
          )}
        </div>
        <div className="border-t border-[#232733] p-3">
          <Composer providers={providers} sending={sending} invalidMessage={invalidMessage} onSend={(t, p) => send(t, p)} />
        </div>
      </div>
    </div>
  );
}
