import { Icon } from './Icon';

type RecurringTagProps = {
  label: string;
};

export function RecurringTag({ label }: RecurringTagProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 11,
        color: 'var(--text-secondary)',
      }}
    >
      <Icon name="repeat" size={11} stroke={1.7} />
      {label}
    </span>
  );
}
