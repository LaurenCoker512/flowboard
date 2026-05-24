import { describe, it, expect, vi } from 'vitest';

// ─── Subtask sort-order rebalancing logic ────────────────────────────────────
// The reorderSubtasks action assigns integer indices 1,2,3...
// We test the ordering logic in isolation.

function applyReorder<T extends { id: string; sortOrder: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved!);
  return reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
}

describe('subtask sort-order rebalancing', () => {
  const items = [
    { id: 'a', sortOrder: 1 },
    { id: 'b', sortOrder: 2 },
    { id: 'c', sortOrder: 3 },
  ];

  it('moves item from index 0 to index 2', () => {
    const result = applyReorder(items, 0, 2);
    expect(result.map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(result.map((r) => r.sortOrder)).toEqual([1, 2, 3]);
  });

  it('moves item from index 2 to index 0', () => {
    const result = applyReorder(items, 2, 0);
    expect(result.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(result.map((r) => r.sortOrder)).toEqual([1, 2, 3]);
  });

  it('moving to same index is a no-op', () => {
    const result = applyReorder(items, 1, 1);
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(result.map((r) => r.sortOrder)).toEqual([1, 2, 3]);
  });

  it('assigns dense integers starting at 1', () => {
    const result = applyReorder(items, 0, 1);
    expect(result[0]?.sortOrder).toBe(1);
    expect(result[1]?.sortOrder).toBe(2);
    expect(result[2]?.sortOrder).toBe(3);
  });
});

// ─── show_subtasks_inline toggle propagation ─────────────────────────────────

describe('showSubtasksInline propagation logic', () => {
  // The updateShowSubtasksInline action updates the master and all exceptions.
  // Here we verify the logic that selects which task ID to update.

  function resolveTargetId(taskId: string, masterId: string | null | undefined): string {
    return masterId ?? taskId;
  }

  it('returns the task id for a non-recurring task (no masterId)', () => {
    expect(resolveTargetId('task-1', null)).toBe('task-1');
    expect(resolveTargetId('task-1', undefined)).toBe('task-1');
  });

  it('returns the master id for an exception record', () => {
    expect(resolveTargetId('exception-1', 'master-1')).toBe('master-1');
  });

  it('returns the task id when it is the master (masterId is null)', () => {
    expect(resolveTargetId('master-1', null)).toBe('master-1');
  });
});

// ─── advanceRecurringTask subtask reset ──────────────────────────────────────

describe('subtask completion reset on recurrence advance', () => {
  // Simulates what advanceRecurringTask does to subtasks:
  // it resets isCompleted to false but preserves title and sortOrder.

  type Subtask = { id: string; title: string; isCompleted: boolean; sortOrder: number };

  function resetSubtaskCompletions(subtasks: Subtask[]): Subtask[] {
    return subtasks.map((st) => ({ ...st, isCompleted: false }));
  }

  it('resets isCompleted to false for all subtasks', () => {
    const subtasks: Subtask[] = [
      { id: '1', title: 'Do A', isCompleted: true, sortOrder: 1 },
      { id: '2', title: 'Do B', isCompleted: false, sortOrder: 2 },
      { id: '3', title: 'Do C', isCompleted: true, sortOrder: 3 },
    ];
    const result = resetSubtaskCompletions(subtasks);
    expect(result.every((st) => st.isCompleted === false)).toBe(true);
  });

  it('preserves titles and sort order', () => {
    const subtasks: Subtask[] = [
      { id: '1', title: 'Do A', isCompleted: true, sortOrder: 2 },
      { id: '2', title: 'Do B', isCompleted: true, sortOrder: 5 },
    ];
    const result = resetSubtaskCompletions(subtasks);
    expect(result[0]).toMatchObject({ id: '1', title: 'Do A', sortOrder: 2 });
    expect(result[1]).toMatchObject({ id: '2', title: 'Do B', sortOrder: 5 });
  });

  it('handles an empty subtask list', () => {
    expect(resetSubtaskCompletions([])).toEqual([]);
  });
});

// ─── Board card subtask display logic ────────────────────────────────────────

describe('board card subtask display logic', () => {
  type SubtaskData = { id: string; isCompleted: boolean };

  function computeCardState(
    subtasks: SubtaskData[],
    showSubtasksInline: boolean,
  ): { showInlineList: boolean; completedCount: number; total: number; allComplete: boolean } {
    const total = subtasks.length;
    const completedCount = subtasks.filter((st) => st.isCompleted).length;
    const allComplete = total > 0 && completedCount === total;
    const showInlineList = showSubtasksInline && total > 0 && !allComplete;
    return { showInlineList, completedCount, total, allComplete };
  }

  it('shows counter when subtasks exist', () => {
    const state = computeCardState([{ id: '1', isCompleted: false }], false);
    expect(state.total).toBe(1);
    expect(state.completedCount).toBe(0);
  });

  it('shows inline list when showSubtasksInline is true and not all complete', () => {
    const state = computeCardState(
      [{ id: '1', isCompleted: false }, { id: '2', isCompleted: true }],
      true,
    );
    expect(state.showInlineList).toBe(true);
  });

  it('collapses inline list when all subtasks are complete', () => {
    const state = computeCardState(
      [{ id: '1', isCompleted: true }, { id: '2', isCompleted: true }],
      true,
    );
    expect(state.allComplete).toBe(true);
    expect(state.showInlineList).toBe(false);
  });

  it('does not show inline list when showSubtasksInline is false', () => {
    const state = computeCardState([{ id: '1', isCompleted: false }], false);
    expect(state.showInlineList).toBe(false);
  });

  it('does not show inline list when there are no subtasks', () => {
    const state = computeCardState([], true);
    expect(state.showInlineList).toBe(false);
    expect(state.total).toBe(0);
  });
});
