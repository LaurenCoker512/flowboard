'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { generateRebalancedOrders } from './project-detail-utils';
import type { ProjectDetailTask, ProjectDetailData } from './project-detail-utils';

export async function getProjectDetail(id: string): Promise<ProjectDetailData | null> {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      description: projects.description,
    })
    .from(projects)
    .where(eq(projects.id, id));

  if (project === undefined) return null;

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      status: tasks.status,
      isRecurring: tasks.isRecurring,
      date: tasks.date,
      backlogOrder: tasks.backlogOrder,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, id), eq(tasks.isArchived, false)))
    .orderBy(asc(tasks.createdAt));

  return { ...project, tasks: taskRows };
}

export async function reorderBacklogTask(
  taskId: string,
  newOrder: string,
  projectId: string,
): Promise<void> {
  await db
    .update(tasks)
    .set({ backlogOrder: newOrder, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/board');
}

export async function rebalanceBacklogOrder(projectId: string): Promise<void> {
  const backlogTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, 'backlog'),
        eq(tasks.isArchived, false),
      ),
    )
    .orderBy(asc(tasks.backlogOrder), asc(tasks.createdAt));

  const newOrders = generateRebalancedOrders(backlogTasks.length);

  for (let i = 0; i < backlogTasks.length; i++) {
    const task = backlogTasks[i];
    const newOrder = newOrders[i];
    if (task !== undefined && newOrder !== undefined) {
      await db.update(tasks).set({ backlogOrder: newOrder }).where(eq(tasks.id, task.id));
    }
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectDescription(
  id: string,
  description: string,
): Promise<void> {
  const trimmed = description.trim();
  await db
    .update(projects)
    .set({ description: trimmed.length > 0 ? trimmed : null })
    .where(eq(projects.id, id));

  revalidatePath(`/projects/${id}`);
  revalidatePath('/projects');
}
