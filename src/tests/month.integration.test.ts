import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('month actions — database integration', () => {
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
      .values({ name: 'Month Integration Project', color: '#A8A8D6' })
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

  it('getMonthTasks returns tasks within the month range', async () => {
    const { getMonthTasks } = await import('@/lib/month-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Month task in range',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-05-15',
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getMonthTasks('2026-05-01', '2026-05-31');
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(true);
  });

  it('getMonthTasks excludes tasks outside the month range', async () => {
    const { getMonthTasks } = await import('@/lib/month-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Month task outside range',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-06-15',
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getMonthTasks('2026-05-01', '2026-05-31');
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(false);
  });

  it('getMonthTasks excludes archived tasks', async () => {
    const { getMonthTasks } = await import('@/lib/month-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Archived month task',
        projectId: testProjectId,
        priority: 'must_do',
        status: 'backlog',
        date: '2026-05-20',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getMonthTasks('2026-05-01', '2026-05-31');
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(false);
  });

  it('getMonthTasks returns tasks on the first and last day of the month', async () => {
    const { getMonthTasks } = await import('@/lib/month-actions');

    const [firstTask] = await db
      .insert(tasks)
      .values({
        title: 'First day task',
        projectId: testProjectId,
        priority: 'fun',
        status: 'backlog',
        date: '2026-05-01',
      })
      .returning();
    createdTaskIds.push(firstTask.id);

    const [lastTask] = await db
      .insert(tasks)
      .values({
        title: 'Last day task',
        projectId: testProjectId,
        priority: 'fun',
        status: 'backlog',
        date: '2026-05-31',
      })
      .returning();
    createdTaskIds.push(lastTask.id);

    const rows = await getMonthTasks('2026-05-01', '2026-05-31');
    expect(rows.some((r: { id: string }) => r.id === firstTask.id)).toBe(true);
    expect(rows.some((r: { id: string }) => r.id === lastTask.id)).toBe(true);
  });
});
