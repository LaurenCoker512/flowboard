import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq, and } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('board actions — database integration', () => {
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
      .values({ name: 'Board Integration Test Project', color: '#9AB4D6' })
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

  it('getBoardTasks returns tasks with joined project name and color', async () => {
    const { getBoardTasks } = await import('@/lib/board-actions');

    const [insertedTask] = await db
      .insert(tasks)
      .values({
        title: 'Board integration task',
        projectId: testProjectId,
        priority: 'must_do',
        status: 'up_next',
      })
      .returning();
    createdTaskIds.push(insertedTask.id);

    const rows = await getBoardTasks();
    const found = rows.find((row: { id: string }) => row.id === insertedTask.id);

    expect(found).toBeDefined();
    if (found === undefined) return;
    expect(found.title).toBe('Board integration task');
    expect(found.projectName).toBe('Board Integration Test Project');
    expect(found.projectColor).toBe('#9AB4D6');
    expect(found.priority).toBe('must_do');
    expect(found.status).toBe('up_next');
  });

  it('getBoardTasks excludes archived tasks', async () => {
    const { getBoardTasks } = await import('@/lib/board-actions');

    const [archivedTask] = await db
      .insert(tasks)
      .values({
        title: 'Archived task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'done',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(archivedTask.id);

    const rows = await getBoardTasks();
    const found = rows.find((row: { id: string }) => row.id === archivedTask.id);
    expect(found).toBeUndefined();
  });

  it('updateTaskStatus to done sets completedAt', async () => {
    const { updateTaskStatus } = await import('@/lib/board-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Task to complete',
        projectId: testProjectId,
        priority: 'fun',
        status: 'in_progress',
      })
      .returning();
    createdTaskIds.push(task.id);

    expect(task.completedAt).toBeNull();

    await updateTaskStatus(task.id, 'done');

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.status).toBe('done');
    expect(updated.completedAt).not.toBeNull();
    expect(updated.completedAt instanceof Date).toBe(true);
  });

  it('updateTaskStatus to up_next clears completedAt', async () => {
    const { updateTaskStatus } = await import('@/lib/board-actions');

    const completedAt = new Date();
    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Task to un-complete',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'done',
        completedAt,
      })
      .returning();
    createdTaskIds.push(task.id);

    await updateTaskStatus(task.id, 'up_next');

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.status).toBe('up_next');
    expect(updated.completedAt).toBeNull();
  });

  it('clearDone sets isArchived=true on non-recurring done tasks', async () => {
    const { clearDone } = await import('@/lib/board-actions');

    const [nonRecurring] = await db
      .insert(tasks)
      .values({
        title: 'Done non-recurring',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'done',
        isRecurring: false,
        completedAt: new Date(),
      })
      .returning();
    createdTaskIds.push(nonRecurring.id);

    await clearDone();

    const [archived] = await db.select().from(tasks).where(eq(tasks.id, nonRecurring.id));
    expect(archived.isArchived).toBe(true);
  });

  it('clearDone leaves recurring done tasks untouched', async () => {
    const { clearDone } = await import('@/lib/board-actions');

    const [recurring] = await db
      .insert(tasks)
      .values({
        title: 'Done recurring',
        projectId: testProjectId,
        priority: 'fun',
        status: 'done',
        isRecurring: true,
        completedAt: new Date(),
      })
      .returning();
    createdTaskIds.push(recurring.id);

    await clearDone();

    const [found] = await db.select().from(tasks).where(eq(tasks.id, recurring.id));
    expect(found.isArchived).toBe(false);
  });
});
