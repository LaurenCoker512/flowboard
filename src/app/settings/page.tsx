import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { SettingsClient } from '@/components/SettingsClient';
import { getSettings } from '@/lib/settings-actions';
import { getActiveProjects } from '@/lib/task-actions';

export const metadata = { title: 'Settings — Flowboard' };

export default async function SettingsPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const [settingsRow, projects] = await Promise.all([getSettings(), getActiveProjects()]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <SettingsClient initialSettings={settingsRow} projects={projects} />
    </div>
  );
}
