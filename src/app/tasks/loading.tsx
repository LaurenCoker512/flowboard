import { Skeleton } from '@/components/ui/Skeleton';

export default function TasksLoading() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Skeleton height={28} width={160} />
      {Array.from({ length: 3 }, (_, groupIndex) => (
        <div key={groupIndex} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={14} width={100} />
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 36 }}>
              <Skeleton height={18} width={3} borderRadius={2} />
              <Skeleton height={14} width="60%" />
              <Skeleton height={12} width={60} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
