import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { getProjectDetail } from '@/lib/project-detail-actions';
import { ProjectDetailClient } from './ProjectDetailClient';
import { getActiveProjects } from '@/lib/task-actions';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const data = await getProjectDetail(id);
  return { title: data !== null ? `${data.name} — Flowboard` : 'Project — Flowboard' };
}

export default async function ProjectDetailPage({ params }: Props) {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const { id } = await params;
  const [data, activeProjects] = await Promise.all([
    getProjectDetail(id),
    getActiveProjects(),
  ]);

  if (data === null) {
    notFound();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <main style={{ flex: 1, padding: '28px 28px', maxWidth: 840, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <ProjectDetailClient data={data} projects={activeProjects} />
      </main>
    </div>
  );
}
