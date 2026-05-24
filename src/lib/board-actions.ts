'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type BoardTaskRow = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  isArchived: boolean;
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  isRecurring: boolean;
  completedAt: Date | null;
};

const BOARD_PATHS = ['/board', '/tasks', '/projects'] as const;

function revalidateAll(): void {
  for (const path of BOARD_PATHS) {
    revalidatePath(path);
  }
}

export async function getBoardTasks(): Promise<BoardTaskRow[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      priority: tasks.priority,
      status: tasks.status,
      isArchived: tasks.isArchived,
      date: tasks.date,
      startAt: tasks.startAt,
      endAt: tasks.endAt,
      isRecurring: tasks.isRecurring,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.isArchived, false));

  return rows;
}

export async function updateTaskStatus(
  id: string,
  newStatus: 'up_next' | 'in_progress' | 'done',
): Promise<void> {
  const now = new Date();

  await db
    .update(tasks)
    .set({
      status: newStatus,
      completedAt: newStatus === 'done' ? now : null,
      updatedAt: now,
    })
    .where(eq(tasks.id, id));

  revalidateAll();
}

export async function clearDone(): Promise<void> {
  await db
    .update(tasks)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(tasks.status, 'done'), eq(tasks.isRecurring, false)));

  revalidateAll();
}
