export function TodayChip() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--accent-ink)',
        background: 'var(--accent-tint)',
        border: '1px solid var(--accent-soft)',
        padding: '1px 6px',
        borderRadius: 999,
        letterSpacing: '0.02em',
      }}
    >
      Today
    </span>
  );
}
