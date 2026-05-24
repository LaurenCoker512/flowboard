'use server';

import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { MonthTask } from '@/lib/month-utils';

export async function getMonthTasks(startDate: string, endDate: string): Promise<MonthTask[]> {
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
