import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('backlog actions — database integration', () => {
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
      .values({ name: 'Backlog Integration Test Project', color: '#A6CFB0' })
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

  it('getBacklogTasks returns backlog tasks with joined project name and color', async () => {
    const { getBacklogTasks } = await import('@/lib/backlog-actions');

    const [insertedTask] = await db
      .insert(tasks)
      .values({
        title: 'Backlog integration task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(insertedTask.id);

    const rows = await getBacklogTasks();
    const found = rows.find((row: { id: string }) => row.id === insertedTask.id);

    expect(found).toBeDefined();
    if (found === undefined) return;
    expect(found.title).toBe('Backlog integration task');
    expect(found.projectName).toBe('Backlog Integration Test Project');
    expect(found.projectColor).toBe('#A6CFB0');
    expect(found.priority).toBe('can_wait');
  });

  it('getBacklogTasks excludes archived backlog tasks', async () => {
    const { getBacklogTasks } = await import('@/lib/backlog-actions');

    const [archivedTask] = await db
      .insert(tasks)
      .values({
        title: 'Archived backlog task',
        projectId: testProjectId,
        priority: 'fun',
        status: 'backlog',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(archivedTask.id);

    const rows = await getBacklogTasks();
    const found = rows.find((row: { id: string }) => row.id === archivedTask.id);
    expect(found).toBeUndefined();
  });

  it('getBacklogTasks excludes non-backlog (up_next) tasks', async () => {
    const { getBacklogTasks } = await import('@/lib/backlog-actions');

    const [upNextTask] = await db
      .insert(tasks)
      .values({
        title: 'Up next task',
        projectId: testProjectId,
        priority: 'must_do',
        status: 'up_next',
      })
      .returning();
    createdTaskIds.push(upNextTask.id);

    const rows = await getBacklogTasks();
    const found = rows.find((row: { id: string }) => row.id === upNextTask.id);
    expect(found).toBeUndefined();
  });

  it('promoteToBoard sets status to up_next', async () => {
    const { promoteToBoard } = await import('@/lib/backlog-actions');

    const [backlogTask] = await db
      .insert(tasks)
      .values({
        title: 'Task to promote',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(backlogTask.id);

    await promoteToBoard(backlogTask.id);

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, backlogTask.id));
    expect(updated.status).toBe('up_next');
  });
});
