'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export type BacklogTaskRow = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  isRecurring: boolean;
  date: string | null;
};

export async function getBacklogTasks(): Promise<BacklogTaskRow[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      priority: tasks.priority,
      isRecurring: tasks.isRecurring,
      date: tasks.date,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.status, 'backlog'), eq(tasks.isArchived, false)))
    .orderBy(asc(tasks.createdAt));
  return rows;
}

export async function promoteToBoard(id: string): Promise<void> {
  await db
    .update(tasks)
    .set({ status: 'up_next', updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidatePath('/board');
  revalidatePath('/tasks');
}
