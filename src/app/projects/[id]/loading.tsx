import { Skeleton } from '@/components/ui/Skeleton';

export default function ProjectDetailLoading() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton height={28} width={12} borderRadius={4} />
        <Skeleton height={28} width={200} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {Array.from({ length: 4 }, (_, statIndex) => (
          <div key={statIndex} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton height={22} width={50} />
            <Skeleton height={11} width={70} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={14} width={80} />
        {Array.from({ length: 5 }, (_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 36 }}>
            <Skeleton height={18} width={3} borderRadius={2} />
            <Skeleton height={14} width="55%" />
          </div>
        ))}
      </div>
    </div>
  );
}
