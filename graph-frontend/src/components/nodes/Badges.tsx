import React from 'react';
import { ModelUsed, NodeStatus, MemoryNode } from '../../types';
import { Cpu, Sparkles, CheckCircle2, AlertCircle, Clock, HelpCircle } from 'lucide-react';

export interface ProviderLabel {
  display: string;
  colorKey: 'openai' | 'gemini' | 'claude' | 'unknown';
}

export function providerLabel(node: MemoryNode): ProviderLabel {
  const source = node.provider || node.model_used;
  if (source) {
    const s = source.toLowerCase();
    if (s.startsWith('openai') || s.startsWith('gpt') || s.startsWith('o1-') || s.startsWith('o3-')) {
      return { display: 'OpenAI', colorKey: 'openai' };
    }
    if (s.startsWith('gemini')) {
      return { display: 'Gemini', colorKey: 'gemini' };
    }
    if (s.startsWith('claude') || s.startsWith('anthropic')) {
      return { display: 'Claude', colorKey: 'claude' };
    }
    return { display: node.provider || 'Unknown', colorKey: 'unknown' };
  }
  return { display: 'Unknown', colorKey: 'unknown' };
}

// Light tint styles mapped from providerLabel's colorKey
function providerLabelStyles(key: ProviderLabel['colorKey']) {
  switch (key) {
    case 'openai':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-400/40',
        icon: Cpu,
        iconColor: 'text-emerald-300',
      };
    case 'gemini':
      return {
        bg: 'bg-cyan-500/15',
        text: 'text-cyan-300',
        border: 'border-cyan-400/40',
        icon: Sparkles,
        iconColor: 'text-cyan-300',
      };
    case 'claude':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-400/40',
        icon: Sparkles,
        iconColor: 'text-amber-300',
      };
    default:
      return {
        bg: 'bg-slate-500/15',
        text: 'text-slate-300',
        border: 'border-slate-400/40',
        icon: HelpCircle,
        iconColor: 'text-slate-300',
      };
  }
}

interface ModelBadgeProps {
  model: ModelUsed;
  provider?: string | null;
  failed_providers?: string[];
  size?: 'sm' | 'md';
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({
  model,
  provider,
  failed_providers,
  size = 'sm',
}) => {
  const isSm = size === 'sm';
  const { display, colorKey } = providerLabel({ model_used: model, provider, failed_providers: failed_providers ?? [] } as MemoryNode);
  const styles = providerLabelStyles(colorKey);
  const Icon = styles.icon;

  return (
    <span
      id={`model-badge-${model}-${size}`}
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-md uppercase tracking-wider ${
        isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      } ${styles.bg} ${styles.text} border ${styles.border} shadow-xs`}
    >
      <Icon className={`${isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${styles.iconColor}`} />
      <span>{display}</span>
    </span>
  );
};

interface StatusBadgeProps {
  status: NodeStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const isSm = size === 'sm';

  const config = {
    done: {
      label: 'Done',
      icon: CheckCircle2,
      style: 'bg-emerald-500/15 text-emerald-300/90 border-emerald-400/40',
      iconColor: 'text-emerald-300',
    },
    in_progress: {
      label: 'In Progress',
      icon: Clock,
      style: 'bg-sky-500/15 text-sky-300/90 border-sky-400/40',
      iconColor: 'text-sky-300',
    },
    blocked: {
      label: 'Blocked',
      icon: AlertCircle,
      style: 'bg-rose-500/15 text-rose-300/90 border-rose-400/40',
      iconColor: 'text-rose-300',
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      id={`status-badge-${status}-${size}`}
      className={`inline-flex items-center gap-1 rounded font-medium ${
        isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      } border ${config.style}`}
    >
      <Icon className={`${isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${config.iconColor}`} />
      <span>{config.label}</span>
    </span>
  );
};
