type ToggleProps = {
  on: boolean;
  onToggle: () => void;
  label: string;
};

export function Toggle({ on, onToggle, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 30,
        height: 18,
        borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--bg-sunken)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#FFF8F4',
          top: 2,
          left: on ? 14 : 2,
          transition: 'left 0.15s ease',
        }}
      />
    </button>
  );
}
