import { Skeleton } from '@/components/ui/Skeleton';

export default function HistoryLoading() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Skeleton height={28} width={160} />
      {Array.from({ length: 3 }, (_, groupIndex) => (
        <div key={groupIndex} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={14} width={120} />
          {Array.from({ length: 3 }, (_, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 34 }}>
              <Skeleton height={8} width={8} borderRadius={4} />
              <Skeleton height={13} width="55%" />
              <Skeleton height={11} width={60} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
