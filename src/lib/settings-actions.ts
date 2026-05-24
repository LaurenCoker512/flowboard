'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks, settings } from '@/db/schema';
import { and, eq, lt } from 'drizzle-orm';
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
  const [row] = await db.select().from(settings).limit(1);
  return row ?? null;
}

export async function updateSettings(input: SettingsUpdate): Promise<{ error: string | null }> {
  const [existing] = await db.select({ id: settings.id }).from(settings).limit(1);
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
  const [allTasks, allProjects] = await Promise.all([
    db.select().from(tasks),
    db.select().from(projects),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    tasks: allTasks,
    projects: allProjects,
  };
}

export async function exportDataCSV(): Promise<string> {
  const allTasks = await db.select().from(tasks);
  const csvRows = allTasks.map((t) => ({
    ...t,
    startAt: t.startAt?.toISOString() ?? null,
    endAt: t.endAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
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
