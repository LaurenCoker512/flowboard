import { describe, it, expect, beforeAll } from 'vitest';
import { vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Integration tests are skipped without a dedicated test DB.
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('subtasks — database integration', () => {
  let projectId: string;
  let taskId: string;
  let subtaskId: string;

  beforeAll(async () => {
    if (process.env.DATABASE_URL === undefined) return;

    const { db } = await import('@/db');
    const { projects, tasks } = await import('@/db/schema');

    const [project] = await db
      .insert(projects)
      .values({ name: 'Subtask Test Project', color: '#D49B92' })
      .returning({ id: projects.id });
    projectId = project!.id;

    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Task with subtasks',
        projectId,
        priority: 'can_wait',
        status: 'up_next',
      })
      .returning({ id: tasks.id });
    taskId = task!.id;
  });

  it('createSubtask inserts with correct task_id', async () => {
    const { createSubtask } = await import('@/lib/subtask-actions');
    const result = await createSubtask({ taskId, title: 'First subtask' });
    expect(result.error).toBeNull();
    expect(result.id).toBeTruthy();
    subtaskId = result.id;
  });

  it('getSubtasksForTask returns the created subtask', async () => {
    const { getSubtasksForTask } = await import('@/lib/subtask-actions');
    const list = await getSubtasksForTask(taskId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((st) => st.id === subtaskId)).toBe(true);
  });

  it('updateSubtask toggles isCompleted', async () => {
    const { updateSubtask, getSubtasksForTask } = await import('@/lib/subtask-actions');
    await updateSubtask({ id: subtaskId, isCompleted: true });
    const list = await getSubtasksForTask(taskId);
    const updated = list.find((st) => st.id === subtaskId);
    expect(updated?.isCompleted).toBe(true);
  });

  it('completing all subtasks does not auto-complete the parent task', async () => {
    const { db } = await import('@/db');
    const { tasks } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [task] = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    expect(task?.status).toBe('up_next');
  });

  it('reorderSubtasks updates sort_order', async () => {
    const { createSubtask, reorderSubtasks, getSubtasksForTask } = await import('@/lib/subtask-actions');
    await createSubtask({ taskId, title: 'Second subtask' });
    const before = await getSubtasksForTask(taskId);
    const reversedIds = [...before].reverse().map((st) => st.id);
    await reorderSubtasks(taskId, reversedIds);

    const after = await getSubtasksForTask(taskId);
    expect(after.map((st) => st.id)).toEqual(reversedIds);
  });

  it('deleteSubtask removes the subtask', async () => {
    const { deleteSubtask, getSubtasksForTask } = await import('@/lib/subtask-actions');
    await deleteSubtask(subtaskId);
    const list = await getSubtasksForTask(taskId);
    expect(list.some((st) => st.id === subtaskId)).toBe(false);
  });

  it('updateShowSubtasksInline updates the task row', async () => {
    const { updateShowSubtasksInline } = await import('@/lib/subtask-actions');
    const { db } = await import('@/db');
    const { tasks } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    await updateShowSubtasksInline({ taskId, value: true });

    const [task] = await db
      .select({ showSubtasksInline: tasks.showSubtasksInline })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    expect(task?.showSubtasksInline).toBe(true);
  });

  it('advanceRecurringTask resets subtask isCompleted but preserves titles', async () => {
    const { db } = await import('@/db');
    const { projects, tasks, subtasks } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { advanceRecurringTask } = await import('@/lib/recurrence-actions');

    // Create a daily recurring task
    const [proj] = await db
      .insert(projects)
      .values({ name: 'Recurrence Project', color: '#7BA7A0' })
      .returning({ id: projects.id });

    const [recurTask] = await db
      .insert(tasks)
      .values({
        title: 'Daily task',
        projectId: proj!.id,
        priority: 'must_do',
        status: 'done',
        isRecurring: true,
        date: '2026-05-01',
        recurrenceRule: { frequency: 'daily', interval: 1, ends: null },
        completedAt: new Date('2026-05-01T10:00:00Z'),
      })
      .returning({ id: tasks.id });

    // Add subtasks and mark them complete
    await db.insert(subtasks).values([
      { taskId: recurTask!.id, title: 'Brush teeth', isCompleted: true, sortOrder: 1 },
      { taskId: recurTask!.id, title: 'Make bed', isCompleted: true, sortOrder: 2 },
    ]);

    await advanceRecurringTask(recurTask!.id);

    const taskSubtasks = await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, recurTask!.id));

    expect(taskSubtasks).toHaveLength(2);
    expect(taskSubtasks.every((st) => st.isCompleted === false)).toBe(true);
    expect(taskSubtasks.map((st) => st.title).sort()).toEqual(['Brush teeth', 'Make bed']);
  });
});
