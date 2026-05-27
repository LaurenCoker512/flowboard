'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { projects, tasks, subtasks, settings } from '@/db/schema';
import { and, eq, lt, asc } from 'drizzle-orm';
import { buildTasksCSV, computeClearThreshold } from '@/lib/settings-utils';
import type { Settings } from '@/types';

export type SettingsUpdate = {
  weekStartDay?: 'sunday' | 'monday';
  defaultView?: 'board' | 'week' | 'month';
  defaultProjectId?: string | null;
  density?: 'compact' | 'default' | 'roomy';
  quietEvenings?: boolean;
};

export type ExportData = {
  exportedAt: string;
  tasks: unknown[];
  projects: unknown[];
};

export async function getSettings(): Promise<Settings | null> {
  const session = await auth();
  if (session === null || session.user?.id === undefined) return null;
  const [row] = await db.select().from(settings).where(eq(settings.userId, session.user.id));
  return row ?? null;
}

export async function updateSettings(input: SettingsUpdate): Promise<{ error: string | null }> {
  const session = await auth();
  if (session === null || session.user?.id === undefined) return { error: 'Not authenticated.' };
  const [existing] = await db
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.userId, session.user.id));
  if (existing === undefined) return { error: 'No settings row found.' };

  await db
    .update(settings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(settings.id, existing.id));

  revalidatePath('/settings');
  revalidatePath('/week');
  revalidatePath('/month');
  revalidatePath('/', 'layout');
  return { error: null };
}

export async function exportDataJSON(): Promise<ExportData> {
  const [allTasks, allProjects, allSubtasks] = await Promise.all([
    db.select().from(tasks),
    db.select().from(projects),
    db.select().from(subtasks).orderBy(asc(subtasks.sortOrder)),
  ]);

  const subtasksByTaskId = new Map<string, typeof allSubtasks>();
  for (const st of allSubtasks) {
    const existing = subtasksByTaskId.get(st.taskId) ?? [];
    existing.push(st);
    subtasksByTaskId.set(st.taskId, existing);
  }

  const tasksWithSubtasks = allTasks.map((t) => ({
    ...t,
    subtasks: subtasksByTaskId.get(t.id) ?? [],
  }));

  return {
    exportedAt: new Date().toISOString(),
    tasks: tasksWithSubtasks,
    projects: allProjects,
  };
}

export async function exportDataCSV(): Promise<string> {
  const [allTasks, allSubtasks] = await Promise.all([
    db.select().from(tasks),
    db.select().from(subtasks).orderBy(asc(subtasks.sortOrder)),
  ]);

  const subtasksByTaskId = new Map<string, typeof allSubtasks>();
  for (const st of allSubtasks) {
    const existing = subtasksByTaskId.get(st.taskId) ?? [];
    existing.push(st);
    subtasksByTaskId.set(st.taskId, existing);
  }

  const csvRows = allTasks.map((t) => {
    const taskSubtasks = subtasksByTaskId.get(t.id) ?? [];
    return {
      ...t,
      startAt: t.startAt?.toISOString() ?? null,
      endAt: t.endAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      subtaskTitles: taskSubtasks.map((st) => st.title).join('; '),
      subtaskCompletedCount: taskSubtasks.filter((st) => st.isCompleted).length,
    };
  });
  return buildTasksCSV(csvRows);
}

export async function clearOldArchived(
  olderThanDays: number,
): Promise<{ deletedCount: number; error: string | null }> {
  const threshold = computeClearThreshold(olderThanDays);
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.isArchived, true), lt(tasks.updatedAt, threshold)))
    .returning({ id: tasks.id });

  revalidatePath('/tasks');
  revalidatePath('/board');
  return { deletedCount: deleted.length, error: null };
}
