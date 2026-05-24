import { PRIORITY_COLORS } from '@/lib/design';

type PriorityBadgeProps = {
  priority: 'must_do' | 'can_wait' | 'fun';
  size?: 'sm' | 'md';
};

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const colors = PRIORITY_COLORS[priority];
  const fontSize = size === 'sm' ? 10 : 11;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 7px 2px 6px',
        borderRadius: 999,
        border: `1px solid ${colors.soft}`,
        background: colors.tint,
        color: colors.color,
        fontSize,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors.color,
          flexShrink: 0,
        }}
      />
      {colors.label}
    </span>
  );
}
