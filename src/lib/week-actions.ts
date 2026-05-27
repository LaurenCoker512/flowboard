'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { getOccurrencesInRange, type RecurrenceRule } from '@/lib/recurrence';

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
  isProjected?: boolean;
};

export async function getWeekTasks(startDate: string, endDate: string): Promise<WeekTaskRow[]> {
  const realRows = await db
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

  // Fetch all recurring master tasks that could have future occurrences in range
  const recurringMasters = await db
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
        eq(tasks.isRecurring, true),
        isNull(tasks.recurringMasterId),
        eq(tasks.isArchived, false),
        isNotNull(tasks.date),
        lte(tasks.date, endDate),
      ),
    );

  // Fetch exception occurrence dates that fall in range
  const exceptionRows = await db
    .select({
      recurringMasterId: tasks.recurringMasterId,
      recurringOccurrenceDate: tasks.recurringOccurrenceDate,
    })
    .from(tasks)
    .where(
      and(
        isNotNull(tasks.recurringMasterId),
        isNotNull(tasks.recurringOccurrenceDate),
        gte(tasks.recurringOccurrenceDate, startDate),
        lte(tasks.recurringOccurrenceDate, endDate),
      ),
    );

  // Build a Map<masterId, Set<occurrenceDate>> from exceptions
  const exceptionsByMaster = new Map<string, Set<string>>();
  for (const exc of exceptionRows) {
    if (exc.recurringMasterId === null || exc.recurringOccurrenceDate === null) continue;
    const existing = exceptionsByMaster.get(exc.recurringMasterId);
    if (existing !== undefined) {
      existing.add(exc.recurringOccurrenceDate);
    } else {
      exceptionsByMaster.set(exc.recurringMasterId, new Set([exc.recurringOccurrenceDate]));
    }
  }

  // Build projected rows
  const projections: WeekTaskRow[] = [];
  for (const master of recurringMasters) {
    if (master.date === null || master.recurrenceRule === null) continue;
    const rule = master.recurrenceRule as RecurrenceRule;
    const occurrenceDates = getOccurrencesInRange(rule, master.date, startDate, endDate);
    const exceptions = exceptionsByMaster.get(master.id) ?? new Set<string>();
    for (const projectedDate of occurrenceDates) {
      if (exceptions.has(projectedDate)) continue;
      projections.push({
        ...master,
        date: projectedDate,
        isProjected: true,
      });
    }
  }

  return [...realRows, ...projections];
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
