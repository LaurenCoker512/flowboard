import { NavBar } from '@/components/NavBar';

export const metadata = { title: 'Board — Flowboard' };

export default function BoardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <main style={{ flex: 1, padding: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Board — coming in Phase 8.</p>
      </main>
    </div>
  );
}
