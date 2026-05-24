'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { subtasks, tasks } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { SubtaskData } from '@/types';

const PATHS_TO_REVALIDATE = ['/board', '/tasks'] as const;

function revalidateAll(): void {
  for (const path of PATHS_TO_REVALIDATE) {
    revalidatePath(path);
  }
}

export async function getSubtasksForTask(taskId: string): Promise<SubtaskData[]> {
  return db
    .select({
      id: subtasks.id,
      title: subtasks.title,
      isCompleted: subtasks.isCompleted,
      sortOrder: subtasks.sortOrder,
    })
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))
    .orderBy(asc(subtasks.sortOrder));
}

export async function createSubtask(input: {
  taskId: string;
  title: string;
}): Promise<{ id: string; sortOrder: number; error: string | null }> {
  const title = input.title.trim();
  if (!title) return { id: '', sortOrder: 0, error: 'Title is required.' };
  if (title.length > 255) return { id: '', sortOrder: 0, error: 'Title must be 255 characters or fewer.' };

  const existing = await db
    .select({ sortOrder: subtasks.sortOrder })
    .from(subtasks)
    .where(eq(subtasks.taskId, input.taskId))
    .orderBy(asc(subtasks.sortOrder));

  const sortOrder = existing.length > 0 ? (existing[existing.length - 1]!.sortOrder + 1) : 1;

  const [inserted] = await db
    .insert(subtasks)
    .values({ taskId: input.taskId, title, sortOrder })
    .returning({ id: subtasks.id, sortOrder: subtasks.sortOrder });

  if (inserted === undefined) return { id: '', sortOrder: 0, error: 'Failed to create subtask.' };

  revalidateAll();
  return { id: inserted.id, sortOrder: inserted.sortOrder, error: null };
}

export async function updateSubtask(input: {
  id: string;
  title?: string;
  isCompleted?: boolean;
}): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { error: 'Title is required.' };
    if (title.length > 255) return { error: 'Title must be 255 characters or fewer.' };
    updates.title = title;
  }

  if (input.isCompleted !== undefined) {
    updates.isCompleted = input.isCompleted;
  }

  if (Object.keys(updates).length === 0) return { error: null };

  await db.update(subtasks).set(updates).where(eq(subtasks.id, input.id));
  revalidateAll();
  return { error: null };
}

export async function deleteSubtask(id: string): Promise<void> {
  await db.delete(subtasks).where(eq(subtasks.id, id));
  revalidateAll();
}

export async function reorderSubtasks(
  taskId: string,
  orderedIds: string[],
): Promise<{ error: string | null }> {
  if (orderedIds.length === 0) return { error: null };

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(subtasks)
      .set({ sortOrder: i + 1 })
      .where(and(eq(subtasks.id, orderedIds[i]!), eq(subtasks.taskId, taskId)));
  }

  revalidateAll();
  return { error: null };
}

export async function updateShowSubtasksInline(input: {
  taskId: string;
  value: boolean;
  masterId?: string | null;
}): Promise<{ error: string | null }> {
  const now = new Date();
  const targetId = input.masterId ?? input.taskId;

  // Update the master (or non-recurring) task
  await db
    .update(tasks)
    .set({ showSubtasksInline: input.value, updatedAt: now })
    .where(eq(tasks.id, targetId));

  // Propagate to all existing exception records linked to this master
  await db
    .update(tasks)
    .set({ showSubtasksInline: input.value, updatedAt: now })
    .where(eq(tasks.recurringMasterId, targetId));

  revalidateAll();
  return { error: null };
}
