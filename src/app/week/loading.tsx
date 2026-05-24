import { Skeleton } from '@/components/ui/Skeleton';

export default function WeekLoading() {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton height={28} width={200} />
        <Skeleton height={28} width={80} style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {Array.from({ length: 7 }, (_, dayIndex) => (
          <div key={dayIndex} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 4px' }}>
            <Skeleton height={14} width="60%" />
            <Skeleton height={40} borderRadius={6} />
            <Skeleton height={28} borderRadius={6} />
          </div>
        ))}
      </div>
    </div>
  );
}
