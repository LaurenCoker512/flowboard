import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('project CRUD — database integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projects: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tasks: any;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const dbModule = await import('@/db');
    const schemaModule = await import('@/db/schema');
    db = dbModule.db;
    projects = schemaModule.projects;
    tasks = schemaModule.tasks;
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      for (const id of createdIds) {
        await db.delete(projects).where(eq(projects.id, id)).catch(() => {});
      }
    }
  });

  it('creates a project and retrieves it', async () => {
    const [row] = await db
      .insert(projects)
      .values({ name: 'Integration Test Project', color: '#D49B92' })
      .returning();
    createdIds.push(row.id);

    const [found] = await db.select().from(projects).where(eq(projects.id, row.id));
    expect(found.name).toBe('Integration Test Project');
    expect(found.color).toBe('#D49B92');
    expect(found.isArchived).toBe(false);
  });

  it('updates a project name and color', async () => {
    const [row] = await db
      .insert(projects)
      .values({ name: 'Before Update', color: '#D49B92' })
      .returning();
    createdIds.push(row.id);

    await db
      .update(projects)
      .set({ name: 'After Update', color: '#9AB4D6' })
      .where(eq(projects.id, row.id));

    const [updated] = await db.select().from(projects).where(eq(projects.id, row.id));
    expect(updated.name).toBe('After Update');
    expect(updated.color).toBe('#9AB4D6');
  });

  it('archives a project (sets is_archived = true)', async () => {
    const [row] = await db
      .insert(projects)
      .values({ name: 'To Archive', color: '#D49B92' })
      .returning();
    createdIds.push(row.id);

    await db.update(projects).set({ isArchived: true }).where(eq(projects.id, row.id));

    const [archived] = await db.select().from(projects).where(eq(projects.id, row.id));
    expect(archived.isArchived).toBe(true);
  });

  it('restores an archived project (sets is_archived = false)', async () => {
    const [row] = await db
      .insert(projects)
      .values({ name: 'To Restore', color: '#D49B92', isArchived: true })
      .returning();
    createdIds.push(row.id);

    await db.update(projects).set({ isArchived: false }).where(eq(projects.id, row.id));

    const [restored] = await db.select().from(projects).where(eq(projects.id, row.id));
    expect(restored.isArchived).toBe(false);
  });

  it('archived projects are excluded from a query filtered to active only', async () => {
    const [active] = await db
      .insert(projects)
      .values({ name: 'Active Project', color: '#D49B92' })
      .returning();
    createdIds.push(active.id);

    const [archived] = await db
      .insert(projects)
      .values({ name: 'Archived Project', color: '#D49B92', isArchived: true })
      .returning();
    createdIds.push(archived.id);

    const { eq: eqFn } = await import('drizzle-orm');
    const activeResults = await db
      .select()
      .from(projects)
      .where(eqFn(projects.isArchived, false));

    const ids = activeResults.map((r: { id: string }) => r.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(archived.id);
  });

  it('deletes a project and cascades to its tasks', async () => {
    const [project] = await db
      .insert(projects)
      .values({ name: 'To Delete', color: '#D49B92' })
      .returning();

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Orphan task',
        projectId: project.id,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();

    await db.delete(projects).where(eq(projects.id, project.id));

    const remainingProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id));
    expect(remainingProjects).toHaveLength(0);

    const remainingTasks = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(remainingTasks).toHaveLength(0);
  });

  it('getProjectsWithTaskCounts returns correct task counts', async () => {
    const { getProjectsWithTaskCounts } = await import('@/lib/project-actions');

    const [project] = await db
      .insert(projects)
      .values({ name: 'Count Test Project', color: '#D49B92' })
      .returning();
    createdIds.push(project.id);

    await db.insert(tasks).values([
      { title: 'Task 1', projectId: project.id, priority: 'can_wait', status: 'backlog' },
      { title: 'Task 2', projectId: project.id, priority: 'must_do', status: 'up_next' },
    ]);

    const all = await getProjectsWithTaskCounts();
    const found = all.find((p) => p.id === project.id);
    expect(found).toBeDefined();
    expect(found?.taskCount).toBe(2);
  });
});
