import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('task CRUD — database integration', () => {
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
      .values({ name: 'Task CRUD Test Project', color: '#D49B92' })
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

  it('createTaskAction creates a task and it is retrievable', async () => {
    const { createTaskAction } = await import('@/lib/task-actions');

    const result = await createTaskAction({
      title: 'Integration test task',
      projectId: testProjectId,
      priority: 'can_wait',
      status: 'backlog',
    });

    expect(result.error).toBeNull();

    const [found] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, testProjectId));

    expect(found).toBeDefined();
    expect(found.title).toBe('Integration test task');
    expect(found.priority).toBe('can_wait');
    expect(found.status).toBe('backlog');
    createdTaskIds.push(found.id);
  });

  it('updateTaskAction updates fields and sets updatedAt', async () => {
    const { updateTaskAction } = await import('@/lib/task-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Before update',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(task.id);

    const originalUpdatedAt = task.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await updateTaskAction({
      id: task.id,
      title: 'After update',
      projectId: testProjectId,
      priority: 'must_do',
      status: 'up_next',
    });

    expect(result.error).toBeNull();

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.title).toBe('After update');
    expect(updated.priority).toBe('must_do');
    expect(updated.status).toBe('up_next');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('deleteTaskAction removes the task', async () => {
    const { deleteTaskAction } = await import('@/lib/task-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'To be deleted',
        projectId: testProjectId,
        priority: 'fun',
        status: 'backlog',
      })
      .returning();

    await deleteTaskAction(task.id);

    const remaining = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(remaining).toHaveLength(0);
  });

  it('updateTaskAction with date=null clears startAt and endAt', async () => {
    const { updateTaskAction } = await import('@/lib/task-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Has date and times',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-05-23',
        startAt: new Date('2026-05-23T09:00:00Z'),
        endAt: new Date('2026-05-23T10:00:00Z'),
      })
      .returning();
    createdTaskIds.push(task.id);

    const result = await updateTaskAction({
      id: task.id,
      title: 'Has date and times',
      projectId: testProjectId,
      priority: 'can_wait',
      status: 'backlog',
      date: null,
    });

    expect(result.error).toBeNull();

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.date).toBeNull();
    expect(updated.startAt).toBeNull();
    expect(updated.endAt).toBeNull();
  });
});
