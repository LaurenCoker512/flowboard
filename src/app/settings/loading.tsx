import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Skeleton height={28} width={120} />
      {Array.from({ length: 5 }, (_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton height={13} width={140} />
            <Skeleton height={11} width={220} />
          </div>
          <Skeleton height={28} width={80} borderRadius={6} />
        </div>
      ))}
    </div>
  );
}
