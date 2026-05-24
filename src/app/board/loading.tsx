import { Skeleton } from '@/components/ui/Skeleton';

export default function BoardLoading() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '16px 20px', height: '100vh', overflow: 'hidden' }}>
      {Array.from({ length: 4 }, (_, colIndex) => (
        <div key={colIndex} style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={20} width={120} style={{ marginBottom: 8 }} />
          {Array.from({ length: 3 + (colIndex % 2) }, (_, cardIndex) => (
            <div
              key={cardIndex}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <Skeleton height={14} width="85%" />
              <Skeleton height={12} width="50%" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
