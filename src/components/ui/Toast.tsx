import React from 'react';

type ToastKind = 'success' | 'info' | 'warning';

const KIND_STYLES: Record<ToastKind, { background: string; border: string }> = {
  success: {
    background: 'var(--p-fun-tint)',
    border: 'var(--p-fun-soft)',
  },
  info: {
    background: 'var(--bg-surface)',
    border: 'var(--border)',
  },
  warning: {
    background: 'var(--p-must-tint)',
    border: 'var(--p-must-soft)',
  },
};

type ToastProps = {
  kind?: ToastKind;
  children: React.ReactNode;
};

export function Toast({ kind = 'info', children }: ToastProps) {
  const styles = KIND_STYLES[kind];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        boxShadow: '0 4px 14px rgba(40,30,20,0.08)',
        fontSize: 13,
        background: styles.background,
        border: `1px solid ${styles.border}`,
      }}
    >
      {children}
    </div>
  );
}
