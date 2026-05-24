import { Icon } from '@/components/ui/Icon';

type TodayBannerProps = {
  appointmentCount: number;
  upNextCount: number;
  backlogCount: number;
};

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function TodayBanner({ appointmentCount, upNextCount, backlogCount }: TodayBannerProps) {
  return (
    <div
      style={{
        padding: '12px 22px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 20,
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}
      >
        {formatTodayDate()}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--p-must)', fontWeight: 500 }}>
          {appointmentCount} {appointmentCount === 1 ? 'appointment' : 'appointments'}
        </span>
        <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>·</span>
        <span>
          {upNextCount} {upNextCount === 1 ? 'thing' : 'things'} up next
        </span>
        <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>·</span>
        <span>{backlogCount} in backlog</span>
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-tertiary)',
          fontStyle: 'italic',
          fontFamily: 'var(--font-serif)',
        }}
      >
        <Icon name="leaf" size={13} stroke={1.5} />
        Take it gently today.
      </div>
    </div>
  );
}
