'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { getNextOccurrence } from '@/lib/recurrence';
import { advanceRecurringTask } from '@/lib/recurrence-actions';
import type { RecurrenceRule } from '@/lib/recurrence';

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
  recurrenceRule: unknown;
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
      recurrenceRule: tasks.recurrenceRule,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.isArchived, false));

  return rows;
}

export async function updateTaskStatus(
  id: string,
  newStatus: 'up_next' | 'in_progress' | 'done',
): Promise<{ recurringNextDate: string | null }> {
  const now = new Date();
  let recurringNextDate: string | null = null;

  if (newStatus === 'done') {
    const [task] = await db
      .select({
        isRecurring: tasks.isRecurring,
        recurrenceRule: tasks.recurrenceRule,
        date: tasks.date,
      })
      .from(tasks)
      .where(eq(tasks.id, id));

    if (task !== undefined && task.isRecurring && task.recurrenceRule !== null && task.date !== null) {
      const rule = task.recurrenceRule as RecurrenceRule;
      const nextDate = getNextOccurrence(rule, new Date(task.date));
      recurringNextDate = nextDate.toISOString().slice(0, 10);
    }
  }

  await db
    .update(tasks)
    .set({
      status: newStatus,
      completedAt: newStatus === 'done' ? now : null,
      updatedAt: now,
    })
    .where(eq(tasks.id, id));

  revalidateAll();
  return { recurringNextDate };
}

export async function clearDone(): Promise<void> {
  // Archive non-recurring, non-exception done tasks
  await db
    .update(tasks)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(
      and(
        eq(tasks.status, 'done'),
        eq(tasks.isRecurring, false),
        isNull(tasks.recurringMasterId),
        eq(tasks.isArchived, false),
      ),
    );

  // Advance recurring master tasks that are done
  const recurringDone = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.status, 'done'), eq(tasks.isRecurring, true), eq(tasks.isArchived, false)));

  for (const task of recurringDone) {
    await advanceRecurringTask(task.id);
  }

  // Advance done exception records
  const exceptionsDone = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'done'),
        isNotNull(tasks.recurringMasterId),
        eq(tasks.isArchived, false),
      ),
    );

  for (const exc of exceptionsDone) {
    await advanceRecurringTask(exc.id);
  }

  revalidateAll();
}
