import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useDashboard();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[#232733]';
        let icon = <Info className="w-4 h-4 text-[#BFD4FF] shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-[#10B981]/40';
          icon = <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-[#EF4444]/40';
          icon = <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-[#F59E0B]/40';
          icon = <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg bg-[#12151C] border ${borderClass} shadow-xl shadow-black/60 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#F1F3F9]">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-[#8A92A6] mt-0.5 leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8A92A6] hover:text-[#F1F3F9] p-0.5 rounded transition-colors"
              aria-label="Close toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
