'use server';

import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { AllTask } from '@/lib/all-tasks-utils';

export async function getAllTasks(): Promise<AllTask[]> {
  return db
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
      recurrenceRule: tasks.recurrenceRule,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id));
}
