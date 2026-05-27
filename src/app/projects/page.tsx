import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { getProjectsWithTaskCounts } from '@/lib/project-actions';
import { ProjectsClient } from './ProjectsClient';

export const metadata = { title: 'Projects — Flowboard' };

export default async function ProjectsPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const allProjects = await getProjectsWithTaskCounts();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <main style={{ flex: 1, padding: '28px 28px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
        <ProjectsClient initialProjects={allProjects} />
      </main>
    </div>
  );
}
