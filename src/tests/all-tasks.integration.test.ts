import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('getAllTasks — database integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projects: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tasks: any;

  let testProjectId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    const dbModule = await import('@/db');
    const schemaModule = await import('@/db/schema');
    db = dbModule.db;
    projects = schemaModule.projects;
    tasks = schemaModule.tasks;

    const [project] = await db
      .insert(projects)
      .values({ name: 'All Tasks Integration Project', color: '#B8C4E0' })
      .returning();
    testProjectId = project.id;
  });

  afterAll(async () => {
    for (const taskId of createdTaskIds) {
      await db.delete(tasks).where(eq(tasks.id, taskId)).catch(() => {});
    }
    if (testProjectId) {
      await db.delete(projects).where(eq(projects.id, testProjectId)).catch(() => {});
    }
  });

  it('returns active tasks', async () => {
    const { getAllTasks } = await import('@/lib/all-tasks-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Active integration task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getAllTasks();
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(true);
  });

  it('includes archived tasks', async () => {
    const { getAllTasks } = await import('@/lib/all-tasks-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Archived integration task',
        projectId: testProjectId,
        priority: 'fun',
        status: 'done',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getAllTasks();
    expect(rows.some((r: { id: string; isArchived: boolean }) => r.id === task.id && r.isArchived)).toBe(true);
  });

  it('includes project name and color in results', async () => {
    const { getAllTasks } = await import('@/lib/all-tasks-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Task with project info',
        projectId: testProjectId,
        priority: 'must_do',
        status: 'in_progress',
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getAllTasks();
    const found = rows.find((r: { id: string }) => r.id === task.id);
    expect(found).not.toBeUndefined();
    expect(found!.projectName).toBe('All Tasks Integration Project');
    expect(found!.projectColor).toBe('#B8C4E0');
  });

  it('returns tasks across multiple statuses', async () => {
    const { getAllTasks } = await import('@/lib/all-tasks-actions');

    const statuses = ['backlog', 'up_next', 'in_progress', 'done'] as const;
    for (const status of statuses) {
      const [task] = await db
        .insert(tasks)
        .values({
          title: `${status} integration task`,
          projectId: testProjectId,
          priority: 'can_wait',
          status,
        })
        .returning();
      createdTaskIds.push(task.id);
    }

    const rows = await getAllTasks();
    const returnedIds = new Set(rows.map((r: { id: string }) => r.id));
    for (const id of createdTaskIds.slice(-4)) {
      expect(returnedIds.has(id)).toBe(true);
    }
  });
});
