import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { BoardClient } from '@/components/BoardClient';
import { getBoardTasks } from '@/lib/board-actions';
import { getBacklogTasks } from '@/lib/backlog-actions';
import { getActiveProjects } from '@/lib/task-actions';
import { getTodayString } from '@/lib/board-utils';
import type { BoardTask } from '@/lib/board-utils';
import type { BoardTaskRow } from '@/lib/board-actions';

export const metadata = { title: 'Board — Flowboard' };

function rowToTask(row: BoardTaskRow): BoardTask {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    projectName: row.projectName,
    projectColor: row.projectColor,
    priority: row.priority,
    status: row.status,
    isArchived: row.isArchived,
    date: row.date,
    startAt: row.startAt,
    endAt: row.endAt,
    isRecurring: row.isRecurring,
    completedAt: row.completedAt,
    recurrenceRule: row.recurrenceRule,
  };
}

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

  const today = getTodayString();
  const allTasks = taskRows.map(rowToTask);

  const backlogCount = allTasks.filter(
    (task) => task.status === 'backlog' && !task.isArchived && task.date !== today,
  ).length;

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
        backlogCount={backlogCount}
      />
    </div>
  );
}
