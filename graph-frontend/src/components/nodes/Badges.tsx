import React from 'react';
import { ModelUsed, NodeStatus, MemoryNode } from '../../types';
import { Cpu, Sparkles, CheckCircle2, AlertCircle, Clock, HelpCircle } from 'lucide-react';

export interface ProviderLabel {
  display: string;
  colorKey: 'openai' | 'gemini' | 'claude' | 'unknown';
}

export function providerLabel(node: MemoryNode): ProviderLabel {
  if (node.provider) {
    const p = node.provider.toLowerCase();
    if (p.includes('openai') || p.includes('gpt') || p.includes('o1') || p.includes('o3')) {
      return { display: 'OpenAI', colorKey: 'openai' };
    }
    if (p.includes('gemini')) {
      return { display: 'Gemini', colorKey: 'gemini' };
    }
    if (p.includes('claude') || p.includes('anthropic')) {
      return { display: 'Claude', colorKey: 'claude' };
    }
    return { display: node.provider, colorKey: 'unknown' };
  }
  // derive from model_used
  const model = node.model_used.toLowerCase();
  if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
    return { display: 'OpenAI', colorKey: 'openai' };
  }
  if (model.includes('gemini')) {
    return { display: 'Gemini', colorKey: 'gemini' };
  }
  if (model.includes('claude')) {
    return { display: 'Claude', colorKey: 'claude' };
  }
  return { display: 'Unknown', colorKey: 'unknown' };
}

function providerLabelStyles(key: ProviderLabel['colorKey']) {
  switch (key) {
    case 'openai':
      return {
        bg: 'bg-emerald-950/70',
        text: 'text-emerald-300',
        border: 'border-emerald-600/40',
        icon: Cpu,
        iconColor: 'text-emerald-400',
      };
    case 'gemini':
      return {
        bg: 'bg-cyan-950/70',
        text: 'text-cyan-300',
        border: 'border-cyan-600/40',
        icon: Sparkles,
        iconColor: 'text-cyan-400',
      };
    case 'claude':
      return {
        bg: 'bg-amber-950/70',
        text: 'text-amber-300',
        border: 'border-amber-600/40',
        icon: Sparkles,
        iconColor: 'text-amber-400',
      };
    default:
      return {
        bg: 'bg-slate-800/70',
        text: 'text-slate-300',
        border: 'border-slate-600/40',
        icon: HelpCircle,
        iconColor: 'text-slate-400',
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
      <Icon className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} style={{ color: styles.iconColor }} />
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
      style: 'bg-emerald-950/50 text-emerald-300/90 border-emerald-800/40',
      iconColor: 'text-emerald-400',
    },
    blocked: {
      label: 'Blocked',
      icon: AlertCircle,
      style: 'bg-rose-950/50 text-rose-300/90 border-rose-800/40',
      iconColor: 'text-rose-400',
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
