import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('week actions — database integration', () => {
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
      .values({ name: 'Week Integration Project', color: '#92BCC2' })
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

  it('getWeekTasks returns tasks within the date range', async () => {
    const { getWeekTasks } = await import('@/lib/week-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Week task in range',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-05-20',
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getWeekTasks('2026-05-18', '2026-05-24');
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(true);
  });

  it('getWeekTasks excludes tasks outside the date range', async () => {
    const { getWeekTasks } = await import('@/lib/week-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Week task outside range',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-06-01',
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getWeekTasks('2026-05-18', '2026-05-24');
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(false);
  });

  it('getWeekTasks excludes archived tasks', async () => {
    const { getWeekTasks } = await import('@/lib/week-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Archived week task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-05-21',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(task.id);

    const rows = await getWeekTasks('2026-05-18', '2026-05-24');
    expect(rows.some((r: { id: string }) => r.id === task.id)).toBe(false);
  });

  it('moveTaskToDate updates the task date', async () => {
    const { moveTaskToDate } = await import('@/lib/week-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Task to move',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        date: '2026-05-20',
      })
      .returning();
    createdTaskIds.push(task.id);

    await moveTaskToDate(task.id, '2026-05-22', null, null);

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.date).toBe('2026-05-22');
    expect(updated.startAt).toBeNull();
    expect(updated.endAt).toBeNull();
  });

  it('moveTaskToDate updates startAt and endAt while preserving the new date', async () => {
    const { moveTaskToDate } = await import('@/lib/week-actions');

    const originalStart = new Date('2026-05-20T14:00:00Z');
    const originalEnd = new Date('2026-05-20T15:00:00Z');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Timed task to move',
        projectId: testProjectId,
        priority: 'must_do',
        status: 'up_next',
        date: '2026-05-20',
        startAt: originalStart,
        endAt: originalEnd,
      })
      .returning();
    createdTaskIds.push(task.id);

    const newStart = new Date('2026-05-23T14:00:00Z');
    const newEnd = new Date('2026-05-23T15:00:00Z');

    await moveTaskToDate(task.id, '2026-05-23', newStart, newEnd);

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.date).toBe('2026-05-23');
    expect(new Date(updated.startAt).getUTCHours()).toBe(14);
    expect(new Date(updated.endAt).getUTCHours()).toBe(15);
  });
});
