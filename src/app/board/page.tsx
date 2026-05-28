import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { BoardClient } from '@/components/BoardClient';
import { getBoardTasks } from '@/lib/board-actions';
import { getBacklogTasks } from '@/lib/backlog-actions';
import { getActiveProjects } from '@/lib/task-actions';

export const metadata = { title: 'Board — Flowboard' };

export default async function BoardPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const [taskRows, backlogTaskRows, projects] = await Promise.all([
    getBoardTasks(),
    getBacklogTasks(),
    getActiveProjects(),
  ]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <NavBar />
      <BoardClient
        initialTasks={taskRows}
        initialBacklogTasks={backlogTaskRows}
        projects={projects}
      />
    </div>
  );
}
