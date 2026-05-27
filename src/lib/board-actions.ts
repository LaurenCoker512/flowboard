'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks, subtasks, taskCompletions } from '@/db/schema';
import { eq, and, isNull, isNotNull, asc } from 'drizzle-orm';
import { getNextOccurrence } from '@/lib/recurrence';
import { advanceRecurringTask } from '@/lib/recurrence-actions';
import type { RecurrenceRule } from '@/lib/recurrence';
import type { SubtaskData } from '@/types';

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
  recurringMasterId: string | null;
  showSubtasksInline: boolean;
  subtasks: SubtaskData[];
};

const BOARD_PATHS = ['/board', '/tasks', '/projects', '/history'] as const;

function revalidateAll(): void {
  for (const path of BOARD_PATHS) {
    revalidatePath(path);
  }
}

export async function getBoardTasks(): Promise<BoardTaskRow[]> {
  const taskRows = await db
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
      recurringMasterId: tasks.recurringMasterId,
      showSubtasksInline: tasks.showSubtasksInline,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.isArchived, false));

  if (taskRows.length === 0) return [];

  // Fetch all subtasks for non-archived tasks in a single query
  const subtaskRows = await db
    .select({
      id: subtasks.id,
      taskId: subtasks.taskId,
      title: subtasks.title,
      isCompleted: subtasks.isCompleted,
      sortOrder: subtasks.sortOrder,
    })
    .from(subtasks)
    .innerJoin(tasks, and(eq(subtasks.taskId, tasks.id), eq(tasks.isArchived, false)))
    .orderBy(asc(subtasks.sortOrder));

  const subtasksByTaskId = new Map<string, SubtaskData[]>();
  for (const row of subtaskRows) {
    const existing = subtasksByTaskId.get(row.taskId) ?? [];
    existing.push({ id: row.id, title: row.title, isCompleted: row.isCompleted, sortOrder: row.sortOrder });
    subtasksByTaskId.set(row.taskId, existing);
  }

  return taskRows.map((row) => ({
    ...row,
    subtasks: subtasksByTaskId.get(row.id) ?? [],
  }));
}

export async function updateTaskStatus(
  id: string,
  newStatus: 'up_next' | 'in_progress' | 'done',
): Promise<{ recurringNextDate: string | null }> {
  const now = new Date();
  let recurringNextDate: string | null = null;

  try {
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
  } catch (err) {
    console.error('[updateTaskStatus]', err);
    return { recurringNextDate: null };
  }
}

export async function clearSingleDoneTask(taskId: string): Promise<void> {
  try {
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        date: tasks.date,
        startAt: tasks.startAt,
        endAt: tasks.endAt,
        isRecurring: tasks.isRecurring,
        completedAt: tasks.completedAt,
        projectId: tasks.projectId,
        recurringMasterId: tasks.recurringMasterId,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId));

    if (task === undefined) return;

    if (task.isRecurring || task.recurringMasterId !== null) {
      await advanceRecurringTask(taskId);
    } else {
      await db.insert(taskCompletions).values({
        taskId: task.id,
        title: task.title,
        projectId: task.projectId,
        projectName: task.projectName,
        projectColor: task.projectColor,
        completedAt: task.completedAt ?? new Date(),
        date: task.date,
        startAt: task.startAt,
        endAt: task.endAt,
        isRecurring: task.isRecurring,
      });
      await db
        .update(tasks)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
    }

    revalidateAll();
  } catch (err) {
    console.error('[clearSingleDoneTask]', err);
    throw err;
  }
}

export async function clearDone(): Promise<void> {
  try {
  // Snapshot non-recurring, non-exception done tasks before archiving
  const nonRecurringDone = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      date: tasks.date,
      startAt: tasks.startAt,
      endAt: tasks.endAt,
      isRecurring: tasks.isRecurring,
      completedAt: tasks.completedAt,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.status, 'done'),
        eq(tasks.isRecurring, false),
        isNull(tasks.recurringMasterId),
        eq(tasks.isArchived, false),
      ),
    );

  const toSnapshot = nonRecurringDone.filter((t) => t.completedAt !== null);
  if (toSnapshot.length > 0) {
    await db.insert(taskCompletions).values(
      toSnapshot.map((t) => ({
        taskId: t.id,
        title: t.title,
        projectId: t.projectId,
        projectName: t.projectName,
        projectColor: t.projectColor,
        completedAt: t.completedAt!,
        date: t.date,
        startAt: t.startAt,
        endAt: t.endAt,
        isRecurring: t.isRecurring,
      })),
    );
  }

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
  } catch (err) {
    console.error('[clearDone]', err);
    throw err;
  }
}
