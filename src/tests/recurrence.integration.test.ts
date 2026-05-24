import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq, and } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('recurrence actions — database integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projects: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tasks: any;
  let testProjectId: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const dbModule = await import('@/db');
    const schemaModule = await import('@/db/schema');
    db = dbModule.db;
    projects = schemaModule.projects;
    tasks = schemaModule.tasks;

    const [project] = await db
      .insert(projects)
      .values({ name: 'Recurrence Test', color: '#A6CFB0' })
      .returning();
    testProjectId = project.id;
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db.delete(tasks).where(eq(tasks.id, id)).catch(() => {});
    }
    await db.delete(projects).where(eq(projects.id, testProjectId)).catch(() => {});
  });

  it('advanceRecurringTask increments count and advances date', async () => {
    const { advanceRecurringTask } = await import('@/lib/recurrence-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Daily recurring',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'done',
        isRecurring: true,
        recurrenceRule: { frequency: 'daily', interval: 1, ends: null },
        date: '2026-05-01',
        completedAt: new Date('2026-05-01T10:00:00Z'),
      })
      .returning();
    createdIds.push(task.id);

    const result = await advanceRecurringTask(task.id);
    expect(result.archived).toBe(false);

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.date).toBe('2026-05-02');
    expect(updated.status).toBe('backlog');
    expect(updated.completedAt).toBeNull();
    expect(updated.completionCount).toBe(1);
  });

  it('advanceRecurringTask archives when after_occurrences limit reached', async () => {
    const { advanceRecurringTask } = await import('@/lib/recurrence-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Ending recurring',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'done',
        isRecurring: true,
        recurrenceRule: { frequency: 'daily', interval: 1, ends: { after_occurrences: 2 } },
        date: '2026-05-01',
        completionCount: 1,
        completedAt: new Date('2026-05-02T10:00:00Z'),
      })
      .returning();
    createdIds.push(task.id);

    const result = await advanceRecurringTask(task.id);
    expect(result.archived).toBe(true);

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.isArchived).toBe(true);
    expect(updated.completionCount).toBe(2);
  });

  it('advanceRecurringTask handles exception record: advances master, deletes exception', async () => {
    const { advanceRecurringTask } = await import('@/lib/recurrence-actions');

    const [master] = await db
      .insert(tasks)
      .values({
        title: 'Master recurring',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        isRecurring: true,
        recurrenceRule: { frequency: 'daily', interval: 1, ends: null },
        date: '2026-05-03',
      })
      .returning();
    createdIds.push(master.id);

    const [exception] = await db
      .insert(tasks)
      .values({
        title: 'Exception occurrence',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'done',
        isRecurring: false,
        recurringMasterId: master.id,
        recurringOccurrenceDate: '2026-05-02',
        date: '2026-05-02',
        completedAt: new Date('2026-05-02T10:00:00Z'),
      })
      .returning();

    await advanceRecurringTask(exception.id);

    // Exception should be deleted
    const exceptions = await db.select().from(tasks).where(eq(tasks.id, exception.id));
    expect(exceptions).toHaveLength(0);

    // Master should be advanced: fromDate=May 2, next=May 3
    const [updatedMaster] = await db.select().from(tasks).where(eq(tasks.id, master.id));
    expect(updatedMaster.date).toBe('2026-05-03');
    expect(updatedMaster.completionCount).toBe(1);
  });

  it('updateAllFutureOccurrences deletes future exceptions and updates master', async () => {
    const { updateAllFutureOccurrences } = await import('@/lib/task-actions');

    const [master] = await db
      .insert(tasks)
      .values({
        title: 'Master task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        isRecurring: true,
        recurrenceRule: { frequency: 'daily', interval: 1, ends: null },
        date: '2026-05-01',
      })
      .returning();
    createdIds.push(master.id);

    // Create past exception (May 2 — before boundary May 3)
    const [excPast] = await db
      .insert(tasks)
      .values({
        title: 'Past exception',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        isRecurring: false,
        recurringMasterId: master.id,
        recurringOccurrenceDate: '2026-05-02',
        date: '2026-05-02',
      })
      .returning();
    createdIds.push(excPast.id);

    // Create future exception (May 4 — on or after boundary May 3)
    const [excFuture] = await db
      .insert(tasks)
      .values({
        title: 'Future exception',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        isRecurring: false,
        recurringMasterId: master.id,
        recurringOccurrenceDate: '2026-05-04',
        date: '2026-05-04',
      })
      .returning();

    await updateAllFutureOccurrences({
      masterId: master.id,
      occurrenceDate: '2026-05-03',
      title: 'Updated master',
      projectId: testProjectId,
      priority: 'must_do',
      status: 'backlog',
      date: '2026-05-03',
      startAt: null,
      endAt: null,
      description: null,
      isRecurring: true,
      recurrenceRule: { frequency: 'daily', interval: 1, ends: null },
    });

    // Future exception (May 4) should be deleted
    const futureExcs = await db.select().from(tasks).where(eq(tasks.id, excFuture.id));
    expect(futureExcs).toHaveLength(0);

    // Past exception (May 2) should remain
    const pastExcs = await db.select().from(tasks).where(eq(tasks.id, excPast.id));
    expect(pastExcs).toHaveLength(1);

    // Master should be updated
    const [updatedMaster] = await db.select().from(tasks).where(eq(tasks.id, master.id));
    expect(updatedMaster.title).toBe('Updated master');
    expect(updatedMaster.priority).toBe('must_do');
  });
});
