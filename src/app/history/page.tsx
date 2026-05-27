import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { HistoryClient } from '@/components/HistoryClient';
import { getCompletionHistory } from '@/lib/history-actions';
import { getActiveProjects } from '@/lib/task-actions';

export const metadata = { title: 'History — Flowboard' };

export default async function HistoryPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const [completions, projects] = await Promise.all([
    getCompletionHistory(),
    getActiveProjects(),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <HistoryClient initialCompletions={completions} projects={projects} />
    </div>
  );
}
