import { ProjectDot } from './ProjectDot';

type SegmentedOption = {
  value: string;
  label: string;
  dot?: string;
  activeBg?: string;
  activeColor?: string;
};

type SegmentedProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
};

export function Segmented({ options, value, onChange, fullWidth = false }: SegmentedProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              flex: fullWidth ? 1 : undefined,
              fontSize: 12.5,
              fontWeight: 500,
              padding: '4px 8px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? (option.activeBg ?? 'var(--bg-surface)') : 'transparent',
              color: isActive ? (option.activeColor ?? 'var(--text-primary)') : 'var(--text-secondary)',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            {option.dot !== undefined && <ProjectDot color={option.dot} size={7} />}
            <span style={{ lineHeight: 1 }}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
