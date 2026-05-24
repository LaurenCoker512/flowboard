import { describe, it, expect } from 'vitest';
import {
  buildBoardColumns,
  applyFilters,
  parseFilters,
  serializeFilters,
  hasActiveFilters,
  DONE_CAP,
} from '@/lib/board-utils';
import type { BoardTask, BoardFilters } from '@/lib/board-utils';

const TODAY = '2026-05-23';
const TOMORROW = '2026-05-24';

function makeTask(overrides: Partial<BoardTask> = {}): BoardTask {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'proj-1',
    projectName: 'Test Project',
    projectColor: '#D49B92',
    priority: 'can_wait',
    status: 'backlog',
    isArchived: false,
    date: null,
    startAt: null,
    endAt: null,
    isRecurring: false,
    completedAt: null,
    recurrenceRule: null,
    ...overrides,
  };
}

describe('buildBoardColumns', () => {
  it('promotes backlog task with date=today into upNext with promoted=true', () => {
    const task = makeTask({ id: 'promo-1', status: 'backlog', date: TODAY });
    const columns = buildBoardColumns([task], TODAY);
    expect(columns.upNext).toHaveLength(1);
    expect(columns.upNext[0]?.promoted).toBe(true);
    expect(columns.appointments).toHaveLength(0);
  });

  it('does not promote backlog task with date=tomorrow', () => {
    const task = makeTask({ id: 'future-1', status: 'backlog', date: TOMORROW });
    const columns = buildBoardColumns([task], TODAY);
    expect(columns.upNext).toHaveLength(0);
    expect(columns.appointments).toHaveLength(0);
    expect(columns.inProgress).toHaveLength(0);
    expect(columns.done).toHaveLength(0);
  });

  it('puts appointment task (date=today with startAt) in appointments not upNext', () => {
    const task = makeTask({
      id: 'appt-1',
      status: 'backlog',
      date: TODAY,
      startAt: new Date('2026-05-23T09:00:00Z'),
    });
    const columns = buildBoardColumns([task], TODAY);
    expect(columns.appointments).toHaveLength(1);
    expect(columns.upNext).toHaveLength(0);
  });

  it('sorts appointments by startAt ascending', () => {
    const later = makeTask({
      id: 'appt-later',
      status: 'backlog',
      date: TODAY,
      startAt: new Date('2026-05-23T14:00:00Z'),
    });
    const earlier = makeTask({
      id: 'appt-earlier',
      status: 'backlog',
      date: TODAY,
      startAt: new Date('2026-05-23T09:00:00Z'),
    });
    const columns = buildBoardColumns([later, earlier], TODAY);
    expect(columns.appointments[0]?.id).toBe('appt-earlier');
    expect(columns.appointments[1]?.id).toBe('appt-later');
  });

  it('caps done column at DONE_CAP', () => {
    const doneTasks: BoardTask[] = Array.from({ length: DONE_CAP + 10 }, (_, index) =>
      makeTask({
        id: `done-${index}`,
        status: 'done',
        completedAt: new Date(Date.now() - index * 1000),
      }),
    );
    const columns = buildBoardColumns(doneTasks, TODAY);
    expect(columns.done).toHaveLength(DONE_CAP);
    expect(columns.doneTotal).toBe(DONE_CAP + 10);
  });

  it('reflects total done count before cap in doneTotal', () => {
    const doneTasks: BoardTask[] = Array.from({ length: 5 }, (_, index) =>
      makeTask({
        id: `done-${index}`,
        status: 'done',
        completedAt: new Date(),
      }),
    );
    const columns = buildBoardColumns(doneTasks, TODAY);
    expect(columns.doneTotal).toBe(5);
  });

  it('excludes archived tasks from all columns', () => {
    const tasks = [
      makeTask({ id: 'arch-1', status: 'up_next', isArchived: true }),
      makeTask({ id: 'arch-2', status: 'in_progress', isArchived: true }),
      makeTask({ id: 'arch-3', status: 'done', isArchived: true }),
      makeTask({ id: 'arch-4', status: 'backlog', date: TODAY, isArchived: true }),
    ];
    const columns = buildBoardColumns(tasks, TODAY);
    expect(columns.appointments).toHaveLength(0);
    expect(columns.upNext).toHaveLength(0);
    expect(columns.inProgress).toHaveLength(0);
    expect(columns.done).toHaveLength(0);
  });

  it('puts up_next tasks in upNext column', () => {
    const task = makeTask({ id: 'up-1', status: 'up_next' });
    const columns = buildBoardColumns([task], TODAY);
    expect(columns.upNext).toHaveLength(1);
    expect(columns.upNext[0]?.promoted).toBeUndefined();
  });

  it('puts in_progress tasks in inProgress column', () => {
    const task = makeTask({ id: 'prog-1', status: 'in_progress' });
    const columns = buildBoardColumns([task], TODAY);
    expect(columns.inProgress).toHaveLength(1);
  });
});

describe('applyFilters', () => {
  const taskA = makeTask({
    id: 'a',
    priority: 'must_do',
    projectId: 'proj-1',
    isRecurring: false,
  });
  const taskB = makeTask({
    id: 'b',
    priority: 'can_wait',
    projectId: 'proj-2',
    isRecurring: true,
  });
  const taskC = makeTask({
    id: 'c',
    priority: 'fun',
    projectId: 'proj-1',
    isRecurring: true,
  });
  const allTasks = [taskA, taskB, taskC];

  const emptyFilters: BoardFilters = {
    priorities: [],
    projectIds: [],
    recurringOnly: false,
  };

  it('returns all tasks when no filters are active', () => {
    expect(applyFilters(allTasks, emptyFilters)).toHaveLength(3);
  });

  it('filters by single priority', () => {
    const result = applyFilters(allTasks, { ...emptyFilters, priorities: ['must_do'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a');
  });

  it('applies OR logic within priorities', () => {
    const result = applyFilters(allTasks, {
      ...emptyFilters,
      priorities: ['must_do', 'fun'],
    });
    expect(result).toHaveLength(2);
    expect(result.map((task) => task.id)).toContain('a');
    expect(result.map((task) => task.id)).toContain('c');
  });

  it('filters by project', () => {
    const result = applyFilters(allTasks, { ...emptyFilters, projectIds: ['proj-2'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('b');
  });

  it('applies AND logic across priority and project filters', () => {
    const result = applyFilters(allTasks, {
      priorities: ['fun'],
      projectIds: ['proj-1'],
      recurringOnly: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('c');
  });

  it('filters by recurringOnly', () => {
    const result = applyFilters(allTasks, { ...emptyFilters, recurringOnly: true });
    expect(result).toHaveLength(2);
    expect(result.map((task) => task.id)).toContain('b');
    expect(result.map((task) => task.id)).toContain('c');
  });

  it('combines all filter types', () => {
    const result = applyFilters(allTasks, {
      priorities: ['can_wait'],
      projectIds: ['proj-2'],
      recurringOnly: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('b');
  });
});

describe('parseFilters', () => {
  it('returns defaults for null input', () => {
    const result = parseFilters(null);
    expect(result.priorities).toEqual([]);
    expect(result.projectIds).toEqual([]);
    expect(result.recurringOnly).toBe(false);
  });

  it('returns defaults for invalid JSON', () => {
    const result = parseFilters('{not valid json}');
    expect(result.priorities).toEqual([]);
    expect(result.recurringOnly).toBe(false);
  });

  it('returns defaults for non-object JSON', () => {
    expect(parseFilters('"string"').priorities).toEqual([]);
    expect(parseFilters('42').priorities).toEqual([]);
    expect(parseFilters('null').priorities).toEqual([]);
  });

  it('parses valid filter JSON correctly', () => {
    const input: BoardFilters = {
      priorities: ['must_do', 'fun'],
      projectIds: ['proj-abc'],
      recurringOnly: true,
    };
    const result = parseFilters(JSON.stringify(input));
    expect(result.priorities).toEqual(['must_do', 'fun']);
    expect(result.projectIds).toEqual(['proj-abc']);
    expect(result.recurringOnly).toBe(true);
  });

  it('filters out invalid priority values', () => {
    const result = parseFilters(
      JSON.stringify({ priorities: ['must_do', 'invalid_value'], projectIds: [], recurringOnly: false }),
    );
    expect(result.priorities).toEqual(['must_do']);
  });

  it('returns defaults for partial/malformed object', () => {
    const result = parseFilters(JSON.stringify({ priorities: 'not-an-array' }));
    expect(result.priorities).toEqual([]);
    expect(result.projectIds).toEqual([]);
    expect(result.recurringOnly).toBe(false);
  });
});

describe('serializeFilters', () => {
  it('round-trips filters correctly', () => {
    const filters: BoardFilters = {
      priorities: ['must_do'],
      projectIds: ['proj-1', 'proj-2'],
      recurringOnly: true,
    };
    const parsed = parseFilters(serializeFilters(filters));
    expect(parsed).toEqual(filters);
  });

  it('serializes empty filters', () => {
    const filters: BoardFilters = { priorities: [], projectIds: [], recurringOnly: false };
    const serialized = serializeFilters(filters);
    expect(JSON.parse(serialized)).toEqual(filters);
  });
});

describe('hasActiveFilters', () => {
  it('returns false for empty filters', () => {
    expect(hasActiveFilters({ priorities: [], projectIds: [], recurringOnly: false })).toBe(false);
  });

  it('returns true when priorities are set', () => {
    expect(hasActiveFilters({ priorities: ['must_do'], projectIds: [], recurringOnly: false })).toBe(true);
  });

  it('returns true when projectIds are set', () => {
    expect(hasActiveFilters({ priorities: [], projectIds: ['proj-1'], recurringOnly: false })).toBe(true);
  });

  it('returns true when recurringOnly is true', () => {
    expect(hasActiveFilters({ priorities: [], projectIds: [], recurringOnly: true })).toBe(true);
  });
});
