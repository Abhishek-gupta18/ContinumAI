import React, { useEffect, useState } from 'react';

export type ToastKind = 'info' | 'error' | 'success';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

let nextId = 1;
const listeners = new Set<(t: ToastItem) => void>();

export function showToast(message: string, kind: ToastKind = 'info'): void {
  const item: ToastItem = { id: nextId++, message, kind };
  listeners.forEach((fn) => fn(item));
}

const KIND_CLASS: Record<ToastKind, string> = {
  info: 'border-[#232733]',
  error: 'border-rose-400/40',
  success: 'border-emerald-400/40',
};

export function ToastViewport(): React.ReactElement | null {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (item: ToastItem) => {
      setItems((current) => [...current, item]);
      setTimeout(() => {
        setItems((current) => current.filter((t) => t.id !== item.id));
      }, 4000);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto rounded-lg border bg-[#12151C] px-3.5 py-2.5 text-xs text-[#F1F3F9] shadow-xl ${KIND_CLASS[item.kind]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
