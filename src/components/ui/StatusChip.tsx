type Status = 'backlog' | 'up_next' | 'in_progress' | 'done';

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  backlog: { label: 'Later', color: 'var(--text-secondary)' },
  up_next: { label: 'Up next', color: 'var(--accent)' },
  in_progress: { label: 'In progress', color: 'var(--p-fun)' },
  done: { label: 'Done', color: 'var(--text-tertiary)' },
};

type StatusChipProps = {
  status: Status;
};

export function StatusChip({ status }: StatusChipProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
        border: '1px solid currentColor',
        color: config.color,
        opacity: 0.95,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
