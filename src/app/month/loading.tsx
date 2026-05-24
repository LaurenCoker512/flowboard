import { Skeleton } from '@/components/ui/Skeleton';

export default function MonthLoading() {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton height={28} width={180} />
        <Skeleton height={28} width={80} style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {Array.from({ length: 35 }, (_, cellIndex) => (
          <div key={cellIndex} style={{ padding: '6px 4px', minHeight: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton height={12} width={20} />
            {cellIndex % 3 === 0 && <Skeleton height={18} borderRadius={4} />}
          </div>
        ))}
      </div>
    </div>
  );
}
