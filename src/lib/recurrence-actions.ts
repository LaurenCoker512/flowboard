'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, lt, isNotNull, isNull } from 'drizzle-orm';
import { getNextOccurrence, isRecurrenceComplete } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';

const BOARD_PATHS = ['/board', '/tasks', '/projects'] as const;

function revalidateAll(): void {
  for (const path of BOARD_PATHS) {
    revalidatePath(path);
  }
}

function dateToString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function advanceRecurringTask(taskId: string): Promise<{ archived: boolean }> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task === undefined) return { archived: false };

  const now = new Date();

  if (task.recurringMasterId !== null) {
    // It's an exception record — fetch master
    const [master] = await db.select().from(tasks).where(eq(tasks.id, task.recurringMasterId));
    if (master === undefined) return { archived: false };

    const rule = master.recurrenceRule as RecurrenceRule | null;
    if (rule === null) return { archived: false };

    const occurrenceDateStr = task.recurringOccurrenceDate ?? task.date ?? master.date;
    if (occurrenceDateStr === null) return { archived: false };

    const fromDate = new Date(occurrenceDateStr);
    const newCount = (master.completionCount ?? 0) + 1;
    const nextDate = getNextOccurrence(rule, fromDate);

    // Delete the exception record
    await db.delete(tasks).where(eq(tasks.id, taskId));

    if (isRecurrenceComplete(rule, newCount, nextDate)) {
      await db
        .update(tasks)
        .set({ isArchived: true, completionCount: newCount, updatedAt: now })
        .where(eq(tasks.id, master.id));
      return { archived: true };
    }

    await db
      .update(tasks)
      .set({
        date: dateToString(nextDate),
        completionCount: newCount,
        status: 'backlog',
        completedAt: null,
        updatedAt: now,
      })
      .where(eq(tasks.id, master.id));
    return { archived: false };
  }

  // It's a master recurring task
  if (!task.isRecurring) return { archived: false };

  const rule = task.recurrenceRule as RecurrenceRule | null;
  if (rule === null || task.date === null) return { archived: false };

  const newCount = (task.completionCount ?? 0) + 1;
  const nextDate = getNextOccurrence(rule, new Date(task.date));

  if (isRecurrenceComplete(rule, newCount, nextDate)) {
    await db
      .update(tasks)
      .set({ isArchived: true, completionCount: newCount, updatedAt: now })
      .where(eq(tasks.id, taskId));
    return { archived: true };
  }

  await db
    .update(tasks)
    .set({
      date: dateToString(nextDate),
      completionCount: newCount,
      status: 'backlog',
      completedAt: null,
      updatedAt: now,
    })
    .where(eq(tasks.id, taskId));
  return { archived: false };
}

export async function advanceNewDayTasks(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all recurring master tasks that are done, not archived, completedAt < today
  const recurringDone = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'done'),
        eq(tasks.isRecurring, true),
        eq(tasks.isArchived, false),
        lt(tasks.completedAt, today),
      ),
    );

  for (const task of recurringDone) {
    await advanceRecurringTask(task.id);
  }

  // Fetch all done exception records
  const exceptionsDone = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'done'),
        isNotNull(tasks.recurringMasterId),
        eq(tasks.isArchived, false),
        lt(tasks.completedAt, today),
      ),
    );

  for (const exc of exceptionsDone) {
    await advanceRecurringTask(exc.id);
  }

  revalidateAll();
}
