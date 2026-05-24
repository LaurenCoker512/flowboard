import { describe, it, expect } from 'vitest';
import {
  applyAllTasksFilters,
  groupTasks,
  formatTaskDate,
  type AllTask,
} from '@/lib/all-tasks-utils';
import type { BoardFilters } from '@/lib/board-utils';

const NO_FILTERS: BoardFilters = { priorities: [], projectIds: [], recurringOnly: false };

function makeTask(overrides: Partial<AllTask> = {}): AllTask {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'proj-a',
    projectName: 'Alpha',
    projectColor: '#aaa',
    priority: 'can_wait',
    status: 'backlog',
    isArchived: false,
    date: null,
    startAt: null,
    endAt: null,
    isRecurring: false,
    recurrenceRule: null,
    completedAt: null,
    ...overrides,
  };
}

// --- applyAllTasksFilters ---

describe('applyAllTasksFilters', () => {
  it('excludes archived tasks when showArchived is false', () => {
    const tasks = [makeTask({ isArchived: true }), makeTask({ id: 'task-2', isArchived: false })];
    const result = applyAllTasksFilters(tasks, NO_FILTERS, '', false);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('task-2');
  });

  it('includes archived tasks when showArchived is true', () => {
    const tasks = [makeTask({ isArchived: true }), makeTask({ id: 'task-2' })];
    const result = applyAllTasksFilters(tasks, NO_FILTERS, '', true);
    expect(result).toHaveLength(2);
  });

  it('filters by priority', () => {
    const tasks = [
      makeTask({ id: 'a', priority: 'must_do' }),
      makeTask({ id: 'b', priority: 'can_wait' }),
      makeTask({ id: 'c', priority: 'fun' }),
    ];
    const result = applyAllTasksFilters(tasks, { ...NO_FILTERS, priorities: ['must_do'] }, '', false);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('filters by project', () => {
    const tasks = [
      makeTask({ id: 'a', projectId: 'proj-a' }),
      makeTask({ id: 'b', projectId: 'proj-b' }),
    ];
    const result = applyAllTasksFilters(
      tasks,
      { ...NO_FILTERS, projectIds: ['proj-b'] },
      '',
      false,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('b');
  });

  it('filters recurring-only', () => {
    const tasks = [
      makeTask({ id: 'a', isRecurring: true }),
      makeTask({ id: 'b', isRecurring: false }),
    ];
    const result = applyAllTasksFilters(
      tasks,
      { ...NO_FILTERS, recurringOnly: true },
      '',
      false,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('filters by search query (case-insensitive)', () => {
    const tasks = [
      makeTask({ id: 'a', title: 'Write unit tests' }),
      makeTask({ id: 'b', title: 'Deploy to production' }),
    ];
    const result = applyAllTasksFilters(tasks, NO_FILTERS, 'UNIT', false);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('returns all tasks when search is whitespace only', () => {
    const tasks = [makeTask(), makeTask({ id: 'task-2' })];
    const result = applyAllTasksFilters(tasks, NO_FILTERS, '   ', false);
    expect(result).toHaveLength(2);
  });

  it('applies priority AND project filters together (AND logic)', () => {
    const tasks = [
      makeTask({ id: 'a', priority: 'must_do', projectId: 'proj-a' }),
      makeTask({ id: 'b', priority: 'must_do', projectId: 'proj-b' }),
      makeTask({ id: 'c', priority: 'can_wait', projectId: 'proj-a' }),
    ];
    const result = applyAllTasksFilters(
      tasks,
      { priorities: ['must_do'], projectIds: ['proj-a'], recurringOnly: false },
      '',
      false,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });
});

// --- groupTasks by project ---

describe('groupTasks — by project', () => {
  it('groups tasks by project, sorted alphabetically', () => {
    const tasks = [
      makeTask({ id: 'a', projectId: 'p2', projectName: 'Zebra' }),
      makeTask({ id: 'b', projectId: 'p1', projectName: 'Apple' }),
      makeTask({ id: 'c', projectId: 'p2', projectName: 'Zebra' }),
    ];
    const groups = groupTasks(tasks, 'project');
    expect(groups).toHaveLength(2);
    expect(groups[0]!.label).toBe('Apple');
    expect(groups[1]!.label).toBe('Zebra');
    expect(groups[1]!.tasks).toHaveLength(2);
  });

  it('includes archived tasks in their project group', () => {
    const tasks = [
      makeTask({ id: 'a', projectId: 'p1', projectName: 'Alpha', isArchived: false }),
      makeTask({ id: 'b', projectId: 'p1', projectName: 'Alpha', isArchived: true }),
    ];
    const groups = groupTasks(tasks, 'project');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.tasks).toHaveLength(2);
  });

  it('task counts match group size', () => {
    const tasks = [
      makeTask({ id: 'a', projectId: 'p1', projectName: 'Alpha' }),
      makeTask({ id: 'b', projectId: 'p1', projectName: 'Alpha' }),
      makeTask({ id: 'c', projectId: 'p2', projectName: 'Beta' }),
    ];
    const groups = groupTasks(tasks, 'project');
    expect(groups[0]!.tasks).toHaveLength(2);
    expect(groups[1]!.tasks).toHaveLength(1);
  });
});

// --- groupTasks by status ---

describe('groupTasks — by status', () => {
  it('groups in correct order: Later, Next, In progress, Done', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done' }),
      makeTask({ id: 'b', status: 'backlog' }),
      makeTask({ id: 'c', status: 'in_progress' }),
      makeTask({ id: 'd', status: 'up_next' }),
    ];
    const groups = groupTasks(tasks, 'status');
    expect(groups.map((g) => g.key)).toEqual(['backlog', 'up_next', 'in_progress', 'done']);
  });

  it('archived tasks go to a separate Archived group at the end', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'backlog', isArchived: false }),
      makeTask({ id: 'b', status: 'done', isArchived: true }),
    ];
    const groups = groupTasks(tasks, 'status');
    const keys = groups.map((g) => g.key);
    expect(keys).toContain('archived');
    expect(keys.indexOf('archived')).toBe(keys.length - 1);
    const archivedGroup = groups.find((g) => g.key === 'archived')!;
    expect(archivedGroup.tasks).toHaveLength(1);
    expect(archivedGroup.tasks[0]!.id).toBe('b');
  });

  it('omits empty status buckets', () => {
    const tasks = [makeTask({ id: 'a', status: 'in_progress' })];
    const groups = groupTasks(tasks, 'status');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.key).toBe('in_progress');
  });
});

// --- groupTasks by date ---

describe('groupTasks — by date', () => {
  it('groups chronologically, no-date tasks last', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-06-01' }),
      makeTask({ id: 'b', date: null }),
      makeTask({ id: 'c', date: '2026-05-01' }),
    ];
    const groups = groupTasks(tasks, 'date');
    expect(groups[0]!.key).toBe('2026-05-01');
    expect(groups[1]!.key).toBe('2026-06-01');
    expect(groups[2]!.key).toBe('no-date');
  });

  it('groups multiple tasks on the same date', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-05-15' }),
      makeTask({ id: 'b', date: '2026-05-15' }),
      makeTask({ id: 'c', date: '2026-05-16' }),
    ];
    const groups = groupTasks(tasks, 'date');
    expect(groups).toHaveLength(2);
    expect(groups[0]!.tasks).toHaveLength(2);
  });
});

// --- formatTaskDate ---

describe('formatTaskDate', () => {
  it('formats a date in the current year without year', () => {
    const result = formatTaskDate('2026-05-15');
    expect(result).toContain('May');
    expect(result).toContain('15');
    expect(result).not.toContain('2026');
  });

  it('formats a date in a different year with year', () => {
    const result = formatTaskDate('2020-01-10');
    expect(result).toContain('Jan');
    expect(result).toContain('10');
    expect(result).toContain('2020');
  });
});
