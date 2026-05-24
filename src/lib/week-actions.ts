'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export type WeekTaskRow = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  isRecurring: boolean;
  recurrenceRule: unknown;
  recurringMasterId: string | null;
  description: string | null;
};

export async function getWeekTasks(startDate: string, endDate: string): Promise<WeekTaskRow[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      priority: tasks.priority,
      status: tasks.status,
      date: tasks.date,
      startAt: tasks.startAt,
      endAt: tasks.endAt,
      isRecurring: tasks.isRecurring,
      recurrenceRule: tasks.recurrenceRule,
      recurringMasterId: tasks.recurringMasterId,
      description: tasks.description,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.isArchived, false),
        gte(tasks.date, startDate),
        lte(tasks.date, endDate),
      ),
    );
  return rows;
}

export async function moveTaskToDate(
  taskId: string,
  newDate: string,
  newStartAt: Date | null,
  newEndAt: Date | null,
): Promise<void> {
  await db
    .update(tasks)
    .set({
      date: newDate,
      startAt: newStartAt,
      endAt: newEndAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  revalidatePath('/week');
  revalidatePath('/board');
  revalidatePath('/month');
}
