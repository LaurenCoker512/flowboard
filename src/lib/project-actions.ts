'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { validateProjectName, validateProjectColor } from './project-utils';
import type { ProjectActionState, ProjectWithCount } from './project-utils';
export type { ProjectActionState, ProjectWithCount } from './project-utils';

export async function getProjectsWithTaskCounts(): Promise<ProjectWithCount[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      isArchived: projects.isArchived,
      createdAt: projects.createdAt,
      taskCount: count(tasks.id),
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .groupBy(
      projects.id,
      projects.name,
      projects.color,
      projects.isArchived,
      projects.createdAt,
    )
    .orderBy(projects.createdAt);
  return rows.map((r) => ({ ...r, taskCount: Number(r.taskCount) }));
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const name = formData.get('name');
  const color = formData.get('color');

  const nameError = validateProjectName(name);
  if (nameError) return { error: nameError };

  const colorError = validateProjectColor(color);
  if (colorError) return { error: colorError };

  try {
    await db.insert(projects).values({
      name: (name as string).trim(),
      color: color as string,
    });
    revalidatePath('/projects');
    return { error: null };
  } catch (err) {
    console.error('[createProjectAction]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function updateProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const id = formData.get('id');
  const name = formData.get('name');
  const color = formData.get('color');

  if (typeof id !== 'string') return { error: 'Invalid project.' };

  const nameError = validateProjectName(name);
  if (nameError) return { error: nameError };

  const colorError = validateProjectColor(color);
  if (colorError) return { error: colorError };

  try {
    await db
      .update(projects)
      .set({ name: (name as string).trim(), color: color as string })
      .where(eq(projects.id, id));
    revalidatePath('/projects');
    return { error: null };
  } catch (err) {
    console.error('[updateProjectAction]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}

export async function archiveProjectAction(id: string): Promise<void> {
  try {
    await db.update(projects).set({ isArchived: true }).where(eq(projects.id, id));
    revalidatePath('/projects');
  } catch (err) {
    console.error('[archiveProjectAction]', err);
    throw err;
  }
}

export async function restoreProjectAction(id: string): Promise<void> {
  try {
    await db.update(projects).set({ isArchived: false }).where(eq(projects.id, id));
    revalidatePath('/projects');
  } catch (err) {
    console.error('[restoreProjectAction]', err);
    throw err;
  }
}

export async function deleteProjectAction(id: string): Promise<void> {
  try {
    await db.delete(projects).where(eq(projects.id, id));
    revalidatePath('/projects');
  } catch (err) {
    console.error('[deleteProjectAction]', err);
    throw err;
  }
}

export async function createProjectInline(
  name: string,
  color: string,
): Promise<{ id: string; name: string; color: string } | { error: string }> {
  const nameError = validateProjectName(name);
  if (nameError) return { error: nameError };

  const colorError = validateProjectColor(color);
  if (colorError) return { error: colorError };

  try {
    const [row] = await db
      .insert(projects)
      .values({ name: name.trim(), color })
      .returning({ id: projects.id, name: projects.name, color: projects.color });

    revalidatePath('/projects');
    revalidatePath('/board');
    revalidatePath('/tasks');
    return row;
  } catch (err) {
    console.error('[createProjectInline]', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}
