import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('Settings — database integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schema: any;
  let testProjectId: string;
  const createdTaskIds: string[] = [];
  let originalWeekStartDay: string | null = null;
  let originalDensity: string | null = null;

  beforeAll(async () => {
    const dbModule = await import('@/db');
    const schemaModule = await import('@/db/schema');
    db = dbModule.db;
    schema = schemaModule;

    const [project] = await db
      .insert(schema.projects)
      .values({ name: 'Settings Integration Project', color: '#88B5A4' })
      .returning();
    testProjectId = project.id;

    const [existing] = await db.select().from(schema.settings).limit(1);
    if (existing !== undefined) {
      originalWeekStartDay = existing.weekStartDay;
      originalDensity = existing.density;
    }
  });

  afterAll(async () => {
    for (const taskId of createdTaskIds) {
      await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId)).catch(() => {});
    }
    await db.delete(schema.projects).where(eq(schema.projects.id, testProjectId)).catch(() => {});

    if (originalWeekStartDay !== null) {
      await db
        .update(schema.settings)
        .set({ weekStartDay: originalWeekStartDay, density: originalDensity ?? 'default' });
    }
  });

  it('updateSettings persists weekStartDay to the database', async () => {
    const { updateSettings } = await import('@/lib/settings-actions');

    const result = await updateSettings({ weekStartDay: 'monday' });
    expect(result.error).toBeNull();

    const [row] = await db.select({ weekStartDay: schema.settings.weekStartDay }).from(schema.settings).limit(1);
    expect(row?.weekStartDay).toBe('monday');
  });

  it('updateSettings persists density to the database', async () => {
    const { updateSettings } = await import('@/lib/settings-actions');

    const result = await updateSettings({ density: 'compact' });
    expect(result.error).toBeNull();

    const [row] = await db.select({ density: schema.settings.density }).from(schema.settings).limit(1);
    expect(row?.density).toBe('compact');
  });

  it('exportDataJSON returns tasks and projects with exportedAt ISO string', async () => {
    const { exportDataJSON } = await import('@/lib/settings-actions');

    const [task] = await db
      .insert(schema.tasks)
      .values({
        title: 'Export test task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(task.id);

    const data = await exportDataJSON();

    expect(typeof data.exportedAt).toBe('string');
    expect(() => new Date(data.exportedAt)).not.toThrow();

    const taskIds = (data.tasks as Array<{ id: string }>).map((t) => t.id);
    expect(taskIds).toContain(task.id);

    const projectIds = (data.projects as Array<{ id: string }>).map((p) => p.id);
    expect(projectIds).toContain(testProjectId);
  });

  it('exportDataCSV returns a CSV string with header and task rows', async () => {
    const { exportDataCSV } = await import('@/lib/settings-actions');

    const [task] = await db
      .insert(schema.tasks)
      .values({
        title: 'CSV export task',
        projectId: testProjectId,
        priority: 'must_do',
        status: 'in_progress',
      })
      .returning();
    createdTaskIds.push(task.id);

    const csv = await exportDataCSV();
    const lines = csv.split('\n');

    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('title');
    expect(lines[0]).toContain('project_id');
    expect(csv).toContain(task.id);
    expect(csv).toContain('CSV export task');
  });

  it('clearOldArchived deletes only archived tasks older than the threshold', async () => {
    const { clearOldArchived } = await import('@/lib/settings-actions');

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    const [oldTask] = await db
      .insert(schema.tasks)
      .values({
        title: 'Old archived task',
        projectId: testProjectId,
        priority: 'fun',
        status: 'done',
        isArchived: true,
        updatedAt: oldDate,
      })
      .returning();
    createdTaskIds.push(oldTask.id);

    const [recentTask] = await db
      .insert(schema.tasks)
      .values({
        title: 'Recent archived task',
        projectId: testProjectId,
        priority: 'fun',
        status: 'done',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(recentTask.id);

    const result = await clearOldArchived(30);
    expect(result.error).toBeNull();
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);

    const [stillExists] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(eq(schema.tasks.id, oldTask.id));
    expect(stillExists).toBeUndefined();

    const [recentExists] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(eq(schema.tasks.id, recentTask.id));
    expect(recentExists).not.toBeUndefined();
  });

  it('clearOldArchived does not delete active (non-archived) tasks', async () => {
    const { clearOldArchived } = await import('@/lib/settings-actions');

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    const [activeTask] = await db
      .insert(schema.tasks)
      .values({
        title: 'Old active task — should not be deleted',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        isArchived: false,
        updatedAt: oldDate,
      })
      .returning();
    createdTaskIds.push(activeTask.id);

    await clearOldArchived(30);

    const [stillExists] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(eq(schema.tasks.id, activeTask.id));
    expect(stillExists).not.toBeUndefined();
  });
});
