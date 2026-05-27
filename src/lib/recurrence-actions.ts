'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tasks, subtasks, projects, taskCompletions } from '@/db/schema';
import { eq, and, lt, ne, isNotNull, isNull } from 'drizzle-orm';
import { getNextOccurrence, isRecurrenceComplete } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';

const BOARD_PATHS = ['/board', '/tasks', '/projects', '/history'] as const;

function revalidateAll(): void {
  for (const path of BOARD_PATHS) {
    revalidatePath(path);
  }
}

function dateToString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function insertCompletionSnapshot(
  task: typeof tasks.$inferSelect,
  completedAt: Date,
  overrideDate?: string | null,
): Promise<void> {
  const [proj] = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.id, task.projectId));
  if (proj === undefined) return;
  await db.insert(taskCompletions).values({
    taskId: task.id,
    title: task.title,
    projectId: proj.id,
    projectName: proj.name,
    projectColor: proj.color,
    completedAt,
    date: overrideDate !== undefined ? overrideDate : task.date,
    startAt: task.startAt,
    endAt: task.endAt,
    isRecurring: task.isRecurring,
  });
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

    await insertCompletionSnapshot(task, task.completedAt ?? now, occurrenceDateStr);

    // Delete the exception record
    await db.delete(tasks).where(eq(tasks.id, taskId));

    if (isRecurrenceComplete(rule, newCount, nextDate)) {
      await db
        .update(tasks)
        .set({ isArchived: true, completionCount: newCount, updatedAt: now })
        .where(eq(tasks.id, master.id));
      return { archived: true };
    }

    // Only advance the master's date if nextDate is later than what it already has.
    // An orphaned exception (its occurrence pre-dates a later rule change) could otherwise
    // regress the master's schedule when completed.
    const advancedDate =
      master.date !== null && nextDate <= new Date(master.date + 'T00:00:00Z')
        ? master.date
        : dateToString(nextDate);

    await db
      .update(tasks)
      .set({
        date: advancedDate,
        completionCount: newCount,
        status: 'backlog',
        completedAt: null,
        updatedAt: now,
      })
      .where(eq(tasks.id, master.id));

    // Reset subtask completion for the new occurrence
    await db
      .update(subtasks)
      .set({ isCompleted: false })
      .where(eq(subtasks.taskId, master.id));

    return { archived: false };
  }

  // It's a master recurring task
  if (!task.isRecurring) return { archived: false };

  const rule = task.recurrenceRule as RecurrenceRule | null;
  if (rule === null || task.date === null) return { archived: false };

  const newCount = (task.completionCount ?? 0) + 1;
  const nextDate = getNextOccurrence(rule, new Date(task.date));

  await insertCompletionSnapshot(task, task.completedAt ?? now);

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

  // Reset subtask completion for the new occurrence
  await db
    .update(subtasks)
    .set({ isCompleted: false })
    .where(eq(subtasks.taskId, taskId));

  return { archived: false };
}

export async function convertMissedOccurrence(taskId: string): Promise<void> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task === undefined) return;
  if (!task.isRecurring || task.recurringMasterId !== null) return;

  const rule = task.recurrenceRule as RecurrenceRule | null;
  if (rule === null || task.date === null) return;

  const now = new Date();
  const nextDate = getNextOccurrence(rule, new Date(task.date));

  if (isRecurrenceComplete(rule, task.completionCount ?? 0, nextDate)) {
    // Archive the master — recurrence is complete
    await db
      .update(tasks)
      .set({ isArchived: true, updatedAt: now })
      .where(eq(tasks.id, taskId));
    return;
  }

  // Create a standalone non-recurring copy preserving the original missed occurrence
  await db.insert(tasks).values({
    title: task.title,
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    date: task.date,
    startAt: task.startAt,
    endAt: task.endAt,
    description: task.description,
    showSubtasksInline: task.showSubtasksInline,
    isRecurring: false,
    recurrenceRule: null,
    recurringMasterId: null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  });

  // Advance the master to the next occurrence
  await db
    .update(tasks)
    .set({
      date: dateToString(nextDate),
      status: 'backlog',
      completedAt: null,
      updatedAt: now,
    })
    .where(eq(tasks.id, taskId));

  // Reset subtask completion for the new occurrence
  await db
    .update(subtasks)
    .set({ isCompleted: false })
    .where(eq(subtasks.taskId, taskId));
}

export async function advanceNewDayTasks(): Promise<void> {
  try {
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

  // Fetch all recurring MASTER tasks that are incomplete with a past date
  const recurringMissed = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.isRecurring, true),
        isNull(tasks.recurringMasterId),
        eq(tasks.isArchived, false),
        isNotNull(tasks.date),
        lt(tasks.date, dateToString(today)),
        ne(tasks.status, 'done'),
      ),
    );

  for (const task of recurringMissed) {
    await convertMissedOccurrence(task.id);
  }

  revalidateAll();
  } catch (err) {
    console.error('[advanceNewDayTasks]', err);
    throw err;
  }
}
