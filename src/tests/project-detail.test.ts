import { describe, it, expect } from 'vitest';
import {
  calculateStats,
  sortBacklogTasks,
  getBacklogOrderBetween,
  generateRebalancedOrders,
  needsRebalance,
} from '@/lib/project-detail-utils';
import type { ProjectDetailTask } from '@/lib/project-detail-utils';

const TODAY = '2026-05-23';

function makeTask(overrides: Partial<ProjectDetailTask> = {}): ProjectDetailTask {
  return {
    id: 'task-1',
    title: 'Test task',
    priority: 'can_wait',
    status: 'backlog',
    isRecurring: false,
    date: null,
    backlogOrder: null,
    completedAt: null,
    ...overrides,
  };
}

describe('calculateStats', () => {
  it('returns zeros for empty task list', () => {
    const stats = calculateStats([], TODAY);
    expect(stats).toEqual({ total: 0, inProgress: 0, backlog: 0, doneThisMonth: 0 });
  });

  it('counts total as all task count', () => {
    const tasks = [
      makeTask({ id: '1', status: 'backlog' }),
      makeTask({ id: '2', status: 'up_next' }),
      makeTask({ id: '3', status: 'done', completedAt: new Date() }),
    ];
    expect(calculateStats(tasks, TODAY).total).toBe(3);
  });

  it('counts only in_progress tasks for inProgress stat', () => {
    const tasks = [
      makeTask({ id: '1', status: 'in_progress' }),
      makeTask({ id: '2', status: 'in_progress' }),
      makeTask({ id: '3', status: 'up_next' }),
    ];
    expect(calculateStats(tasks, TODAY).inProgress).toBe(2);
  });

  it('counts only backlog tasks for backlog stat', () => {
    const tasks = [
      makeTask({ id: '1', status: 'backlog' }),
      makeTask({ id: '2', status: 'backlog' }),
      makeTask({ id: '3', status: 'up_next' }),
    ];
    expect(calculateStats(tasks, TODAY).backlog).toBe(2);
  });

  it('counts done tasks with completedAt in current month for doneThisMonth', () => {
    const tasks = [
      makeTask({ id: '1', status: 'done', completedAt: new Date('2026-05-01T10:00:00Z') }),
      makeTask({ id: '2', status: 'done', completedAt: new Date('2026-05-23T10:00:00Z') }),
      makeTask({ id: '3', status: 'done', completedAt: new Date('2026-04-30T10:00:00Z') }),
      makeTask({ id: '4', status: 'done', completedAt: null }),
    ];
    expect(calculateStats(tasks, TODAY).doneThisMonth).toBe(2);
  });

  it('excludes done tasks from different year in doneThisMonth', () => {
    const tasks = [
      makeTask({ id: '1', status: 'done', completedAt: new Date('2025-05-23T10:00:00Z') }),
    ];
    expect(calculateStats(tasks, TODAY).doneThisMonth).toBe(0);
  });
});

describe('sortBacklogTasks', () => {
  it('sorts tasks with backlogOrder lexicographically', () => {
    const tasks = [
      makeTask({ id: 'c', backlogOrder: 'a2' }),
      makeTask({ id: 'a', backlogOrder: 'a0' }),
      makeTask({ id: 'b', backlogOrder: 'a1' }),
    ];
    const sorted = sortBacklogTasks(tasks);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('places tasks with no backlogOrder after ordered tasks', () => {
    const tasks = [
      makeTask({ id: 'unordered', backlogOrder: null }),
      makeTask({ id: 'ordered', backlogOrder: 'a0' }),
    ];
    const sorted = sortBacklogTasks(tasks);
    expect(sorted[0]?.id).toBe('ordered');
    expect(sorted[1]?.id).toBe('unordered');
  });

  it('does not mutate the original array', () => {
    const tasks = [
      makeTask({ id: 'b', backlogOrder: 'a1' }),
      makeTask({ id: 'a', backlogOrder: 'a0' }),
    ];
    const original = [...tasks];
    sortBacklogTasks(tasks);
    expect(tasks[0]?.id).toBe(original[0]?.id);
  });
});

describe('getBacklogOrderBetween', () => {
  it('generates a key between two existing keys', () => {
    const key = getBacklogOrderBetween('a0', 'a2');
    expect(key > 'a0').toBe(true);
    expect(key < 'a2').toBe(true);
  });

  it('generates a key before the first key (null, b)', () => {
    const key = getBacklogOrderBetween(null, 'a0');
    expect(key < 'a0').toBe(true);
  });

  it('generates a key after the last key (a, null)', () => {
    const key = getBacklogOrderBetween('a0', null);
    expect(key > 'a0').toBe(true);
  });

  it('generates a key when both are null', () => {
    const key = getBacklogOrderBetween(null, null);
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });
});

describe('generateRebalancedOrders', () => {
  it('returns empty array for count 0', () => {
    expect(generateRebalancedOrders(0)).toHaveLength(0);
  });

  it('returns correct number of keys', () => {
    const keys = generateRebalancedOrders(5);
    expect(keys).toHaveLength(5);
  });

  it('returns lexicographically ordered keys', () => {
    const keys = generateRebalancedOrders(4);
    for (let i = 0; i < keys.length - 1; i++) {
      expect(keys[i]! < keys[i + 1]!).toBe(true);
    }
  });
});

describe('needsRebalance', () => {
  it('returns false for short keys', () => {
    expect(needsRebalance('a0')).toBe(false);
    expect(needsRebalance('a1V')).toBe(false);
  });

  it('returns true for keys exceeding length threshold', () => {
    expect(needsRebalance('a0V000000000000000')).toBe(true);
  });
});
