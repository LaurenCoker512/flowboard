'use server';

import { db } from '@/db';
import { taskCompletions, tasks } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export type CompletionRecord = {
  id: string;
  taskId: string | null;
  title: string;
  projectId: string | null;
  projectName: string;
  projectColor: string;
  completedAt: Date;
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  isRecurring: boolean;
};

export type HistoryTask = {
  id: string;
  title: string;
  projectId: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  isArchived: boolean;
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  description: string | null;
  isRecurring: boolean;
  recurrenceRule: unknown;
  recurringMasterId: string | null;
  completedAt: Date | null;
  completionCount: number;
  showSubtasksInline: boolean;
};

export async function getCompletionHistory(): Promise<CompletionRecord[]> {
  return db
    .select({
      id: taskCompletions.id,
      taskId: taskCompletions.taskId,
      title: taskCompletions.title,
      projectId: taskCompletions.projectId,
      projectName: taskCompletions.projectName,
      projectColor: taskCompletions.projectColor,
      completedAt: taskCompletions.completedAt,
      date: taskCompletions.date,
      startAt: taskCompletions.startAt,
      endAt: taskCompletions.endAt,
      isRecurring: taskCompletions.isRecurring,
    })
    .from(taskCompletions)
    .orderBy(desc(taskCompletions.completedAt));
}

export async function getTaskForHistory(taskId: string): Promise<HistoryTask | null> {
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      priority: tasks.priority,
      status: tasks.status,
      isArchived: tasks.isArchived,
      date: tasks.date,
      startAt: tasks.startAt,
      endAt: tasks.endAt,
      description: tasks.description,
      isRecurring: tasks.isRecurring,
      recurrenceRule: tasks.recurrenceRule,
      recurringMasterId: tasks.recurringMasterId,
      completedAt: tasks.completedAt,
      completionCount: tasks.completionCount,
      showSubtasksInline: tasks.showSubtasksInline,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
  return row ?? null;
}
