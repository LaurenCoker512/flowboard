import React from 'react';
import { ProjectDot } from './ProjectDot';

type FilterChipProps = {
  active: boolean;
  color?: string;
  dot?: string;
  onClick: () => void;
  children: React.ReactNode;
};

export function FilterChip({ active, color, dot, onClick, children }: FilterChipProps) {
  const activeColor = color ?? 'var(--text-primary)';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        background: active ? activeColor : 'transparent',
        border: active ? 'none' : '1px solid var(--border)',
        color: active ? '#FFF8F4' : 'var(--text-secondary)',
      }}
    >
      {dot !== undefined && <ProjectDot color={dot} size={7} />}
      {children}
    </button>
  );
}
