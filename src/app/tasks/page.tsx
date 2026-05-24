import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { AllTasksClient } from '@/components/AllTasksClient';
import { getAllTasks } from '@/lib/all-tasks-actions';
import { getActiveProjects } from '@/lib/task-actions';

export const metadata = { title: 'All Tasks — Flowboard' };

export default async function TasksPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const [taskRows, projects] = await Promise.all([getAllTasks(), getActiveProjects()]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <AllTasksClient initialTasks={taskRows} projects={projects} />
    </div>
  );
}
