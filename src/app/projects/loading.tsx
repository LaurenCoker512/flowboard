import { Skeleton } from '@/components/ui/Skeleton';

export default function ProjectsLoading() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height={28} width={140} />
      {Array.from({ length: 6 }, (_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Skeleton height={4} width={4} borderRadius={50} />
          <Skeleton height={14} width="45%" />
          <Skeleton height={12} width={60} style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}
