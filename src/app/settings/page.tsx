import { NavBar } from '@/components/NavBar';

export const metadata = { title: 'Settings — Flowboard' };

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <main style={{ flex: 1, maxWidth: 640, margin: '0 auto', padding: 24, width: '100%' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Full settings — coming in Phase 15.
        </p>
      </main>
    </div>
  );
}
