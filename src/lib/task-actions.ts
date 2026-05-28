'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, asc, gte, isNotNull } from 'drizzle-orm';
import { getNextOccurrence } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';
import { validateTaskTitle } from '@/lib/task-utils';

function revalidateAll(): void {
  revalidatePath('/board');
  revalidatePath('/tasks');
  revalidatePath('/projects', 'layout');
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
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  showSubtasksInline?: boolean;
};

export async function createTaskAction(
  input: CreateTaskInput,
): Promise<{ error: string | null }> {
  const titleError = validateTaskTitle(input.title);
  if (titleError !== null) return { error: titleError };

  try {
    await db.insert(tasks).values({
      title: input.title.trim(),
      projectId: input.projectId,
      priority: input.priority,
      status: input.status,
      date: input.date ?? null,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      description: input.description ?? null,
      isRecurring: input.isRecurring ?? false,
      recurrenceRule: (input.isRecurring ?? false) ? (input.recurrenceRule ?? null) : null,
      showSubtasksInline: input.showSubtasksInline ?? false,
    });
    revalidateAll();
    return { error: null };
  } catch (err) {
    console.error('[createTaskAction]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export type UpdateTaskInput = CreateTaskInput & {
  id: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
};

export async function updateTaskAction(
  input: UpdateTaskInput,
): Promise<{ error: string | null }> {
  const titleError = validateTaskTitle(input.title);
  if (titleError !== null) return { error: titleError };

  const clearTimes = input.date === null || input.date === undefined;

  try {
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
        isRecurring: input.isRecurring ?? false,
        recurrenceRule: (input.isRecurring ?? false) ? (input.recurrenceRule ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));
    revalidateAll();
    return { error: null };
  } catch (err) {
    console.error('[updateTaskAction]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function deleteTaskAction(id: string): Promise<void> {
  try {
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidateAll();
  } catch (err) {
    console.error('[deleteTaskAction]', err);
    throw err;
  }
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

export async function createExceptionRecord(input: {
  masterId: string;
  occurrenceDate: string;
  title: string;
  projectId: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  description: string | null;
}): Promise<{ error: string | null }> {
  const titleError = validateTaskTitle(input.title);
  if (titleError !== null) return { error: titleError };

  try {
    await db.insert(tasks).values({
      title: input.title.trim(),
      projectId: input.projectId,
      priority: input.priority,
      status: input.status,
      date: input.date,
      startAt: input.startAt,
      endAt: input.endAt,
      description: input.description,
      isRecurring: false,
      recurringMasterId: input.masterId,
      recurringOccurrenceDate: input.occurrenceDate,
    });
    revalidateAll();
    return { error: null };
  } catch (err) {
    console.error('[createExceptionRecord]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

function findNearestRuleOccurrence(
  rule: RecurrenceRule,
  ruleStartDate: string,
  targetDate: string,
  windowDays: number,
): string | null {
  const target = new Date(targetDate + 'T00:00:00Z');
  let current = new Date(ruleStartDate + 'T00:00:00Z');

  // Safety: bound the search to avoid infinite loops
  const limit = new Date(target.getTime() + (windowDays + 1) * 86400000);
  let best: string | null = null;
  let bestDiff = Infinity;

  while (current <= limit) {
    const diff = Math.abs(current.getTime() - target.getTime()) / 86400000;
    if (diff <= windowDays && diff < bestDiff) {
      best = current.toISOString().slice(0, 10);
      bestDiff = diff;
    }
    const next = getNextOccurrence(rule, current);
    if (next.getTime() <= current.getTime()) break;
    current = next;
  }

  return best;
}

export async function updateAllFutureOccurrences(input: {
  masterId: string;
  occurrenceDate: string;
  title: string;
  projectId: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  description: string | null;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
}): Promise<{ error: string | null }> {
  try {
    // Remap (or detach) future exceptions rather than deleting them, so that
    // exceptions the user explicitly scheduled are preserved after a rule change.
    const futureExceptions = await db
      .select({ id: tasks.id, recurringOccurrenceDate: tasks.recurringOccurrenceDate })
      .from(tasks)
      .where(
        and(
          eq(tasks.recurringMasterId, input.masterId),
          isNotNull(tasks.recurringOccurrenceDate),
          gte(tasks.recurringOccurrenceDate, input.occurrenceDate),
        ),
      );

    const ruleStartDate = input.date ?? input.occurrenceDate;

    for (const exc of futureExceptions) {
      if (exc.recurringOccurrenceDate === null) continue;
      const nearestDate =
        input.recurrenceRule !== null
          ? findNearestRuleOccurrence(input.recurrenceRule, ruleStartDate, exc.recurringOccurrenceDate, 6)
          : null;
      if (nearestDate !== null) {
        await db
          .update(tasks)
          .set({ recurringOccurrenceDate: nearestDate })
          .where(eq(tasks.id, exc.id));
      } else {
        // No nearby new-rule occurrence — detach as standalone task
        await db
          .update(tasks)
          .set({ recurringMasterId: null, recurringOccurrenceDate: null })
          .where(eq(tasks.id, exc.id));
      }
    }

    // Update master
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
        isRecurring: input.isRecurring,
        recurrenceRule: input.isRecurring ? (input.recurrenceRule ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.masterId));

    revalidateAll();
    return { error: null };
  } catch (err) {
    console.error('[updateAllFutureOccurrences]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}
