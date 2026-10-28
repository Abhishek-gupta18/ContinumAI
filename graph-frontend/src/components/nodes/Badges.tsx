import React from 'react';
import { NodeStatus } from '../../types';

interface ModelBadgeProps {
  model: string;
  size?: 'sm' | 'md';
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({ model, size = 'sm' }) => {
  const isSm = size === 'sm';
  const m = (model || '').toLowerCase();

  let label = model;
  let dotColor = '#EEEAF7';
  let glowClass = '';

  if (m.includes('openai') || m.includes('gpt')) {
    label = m.includes('4o') ? 'GPT-4o' : 'GPT';
    dotColor = '#F0A35E';
    glowClass = 'glow-gpt';
  } else if (m.includes('claude') || m.includes('anthropic')) {
    label = m.includes('sonnet') ? 'Claude 3.5' : 'Claude';
    dotColor = '#E58AB0';
    glowClass = 'glow-claude';
  } else if (m.includes('gemini') || m.includes('google')) {
    label = m.includes('1.5') ? 'Gemini 1.5' : 'Gemini';
    dotColor = '#BFD4FF';
    glowClass = 'glow-gemini';
  } else if (m.includes('openrouter')) {
    label = 'OpenRouter';
    dotColor = '#9BE3C4';
    glowClass = 'glow-openrouter';
  }

  return (
    <span
      id={`model-badge-${model}-${size}`}
      className={`inline-flex items-center gap-1.5 font-mono-code font-medium rounded-full border border-[#2A2455] bg-[#14122B] text-[#EEEAF7] ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${glowClass}`}
        style={{ backgroundColor: dotColor }}
      />
      <span>{label}</span>
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
      dotColor: '#BFD4FF',
      glow: 'glow-gemini',
    },
    in_progress: {
      label: 'Running',
      dotColor: '#F0A35E',
      glow: 'glow-gpt',
    },
    blocked: {
      label: 'Blocked',
      dotColor: '#E58AB0',
      glow: 'glow-claude',
    },
  }[status] || {
    label: status,
    dotColor: '#9C98B8',
    glow: '',
  };

  return (
    <span
      id={`status-badge-${status}-${size}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border border-[#2A2455] bg-[#14122B] text-[#EEEAF7] ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.glow}`}
        style={{ backgroundColor: config.dotColor }}
      />
      <span>{config.label}</span>
    </span>
  );
};
