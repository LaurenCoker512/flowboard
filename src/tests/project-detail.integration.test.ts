import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq, and } from 'drizzle-orm';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('project detail actions — database integration', () => {
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
      .values({ name: 'Project Detail Integration Project', color: '#A6CFB0' })
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

  it('getProjectDetail returns project with tasks', async () => {
    const { getProjectDetail } = await import('@/lib/project-detail-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Detail test task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(task.id);

    const data = await getProjectDetail(testProjectId);
    expect(data).not.toBeNull();
    if (data === null) return;
    expect(data.name).toBe('Project Detail Integration Project');
    expect(data.tasks.some((t: { id: string }) => t.id === task.id)).toBe(true);
  });

  it('getProjectDetail returns null for unknown id', async () => {
    const { getProjectDetail } = await import('@/lib/project-detail-actions');
    const data = await getProjectDetail('00000000-0000-0000-0000-000000000000');
    expect(data).toBeNull();
  });

  it('getProjectDetail excludes archived tasks', async () => {
    const { getProjectDetail } = await import('@/lib/project-detail-actions');

    const [archivedTask] = await db
      .insert(tasks)
      .values({
        title: 'Archived task',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
        isArchived: true,
      })
      .returning();
    createdTaskIds.push(archivedTask.id);

    const data = await getProjectDetail(testProjectId);
    expect(data?.tasks.some((t: { id: string }) => t.id === archivedTask.id)).toBe(false);
  });

  it('reorderBacklogTask updates only the moved task backlog_order', async () => {
    const { reorderBacklogTask } = await import('@/lib/project-detail-actions');

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Task to reorder',
        projectId: testProjectId,
        priority: 'can_wait',
        status: 'backlog',
      })
      .returning();
    createdTaskIds.push(task.id);

    await reorderBacklogTask(task.id, 'a5', testProjectId);

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(updated.backlogOrder).toBe('a5');
  });

  it('rebalanceBacklogOrder assigns ordered keys to all backlog tasks', async () => {
    const { rebalanceBacklogOrder } = await import('@/lib/project-detail-actions');

    const [taskA] = await db
      .insert(tasks)
      .values({ title: 'Rebalance A', projectId: testProjectId, priority: 'can_wait', status: 'backlog' })
      .returning();
    const [taskB] = await db
      .insert(tasks)
      .values({ title: 'Rebalance B', projectId: testProjectId, priority: 'can_wait', status: 'backlog' })
      .returning();
    createdTaskIds.push(taskA.id, taskB.id);

    await rebalanceBacklogOrder(testProjectId);

    const [updatedA] = await db.select().from(tasks).where(eq(tasks.id, taskA.id));
    const [updatedB] = await db.select().from(tasks).where(eq(tasks.id, taskB.id));

    expect(updatedA.backlogOrder).not.toBeNull();
    expect(updatedB.backlogOrder).not.toBeNull();
    // Keys are distinct
    expect(updatedA.backlogOrder).not.toBe(updatedB.backlogOrder);
  });

  it('updateProjectDescription persists the description', async () => {
    const { updateProjectDescription } = await import('@/lib/project-detail-actions');

    await updateProjectDescription(testProjectId, 'A test description');

    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect(proj.description).toBe('A test description');
  });

  it('updateProjectDescription with empty string sets description to null', async () => {
    const { updateProjectDescription } = await import('@/lib/project-detail-actions');

    await updateProjectDescription(testProjectId, '   ');

    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect(proj.description).toBeNull();
  });
});
