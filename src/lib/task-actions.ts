'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

const PATHS_TO_REVALIDATE = ['/board', '/tasks', '/projects'] as const;

function revalidateAll(): void {
  for (const path of PATHS_TO_REVALIDATE) {
    revalidatePath(path);
  }
}

export function validateTaskTitle(title: unknown): string | null {
  if (typeof title !== 'string' || title.trim().length === 0) return 'Title is required.';
  if (title.trim().length > 255) return 'Title must be 255 characters or fewer.';
  return null;
}

export type CreateTaskInput = {
  title: string;
  projectId: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  date?: string | null;
  startAt?: Date | null;
  endAt?: Date | null;
  description?: string | null;
};

export async function createTaskAction(
  input: CreateTaskInput,
): Promise<{ error: string | null }> {
  const titleError = validateTaskTitle(input.title);
  if (titleError !== null) return { error: titleError };

  await db.insert(tasks).values({
    title: input.title.trim(),
    projectId: input.projectId,
    priority: input.priority,
    status: input.status,
    date: input.date ?? null,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    description: input.description ?? null,
  });

  revalidateAll();
  return { error: null };
}

export type UpdateTaskInput = CreateTaskInput & { id: string };

export async function updateTaskAction(
  input: UpdateTaskInput,
): Promise<{ error: string | null }> {
  const titleError = validateTaskTitle(input.title);
  if (titleError !== null) return { error: titleError };

  const clearTimes = input.date === null || input.date === undefined;

  await db
    .update(tasks)
    .set({
      title: input.title.trim(),
      projectId: input.projectId,
      priority: input.priority,
      status: input.status,
      date: input.date ?? null,
      startAt: clearTimes ? null : (input.startAt ?? null),
      endAt: clearTimes ? null : (input.endAt ?? null),
      description: input.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, input.id));

  revalidateAll();
  return { error: null };
}

export async function deleteTaskAction(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidateAll();
}

export async function getActiveProjects(): Promise<
  Array<{ id: string; name: string; color: string }>
> {
  return db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.isArchived, false))
    .orderBy(asc(projects.createdAt));
}
