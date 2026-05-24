import { describe, it, expect } from 'vitest';
import { groupByProject, parseBacklogOpen } from '@/lib/backlog-utils';
import type { BacklogTaskRow } from '@/lib/backlog-actions';

function makeTask(overrides: Partial<BacklogTaskRow> = {}): BacklogTaskRow {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'proj-a',
    projectName: 'Project A',
    projectColor: '#D49B92',
    priority: 'can_wait',
    isRecurring: false,
    ...overrides,
  };
}

describe('groupByProject', () => {
  it('returns empty array when no tasks', () => {
    const result = groupByProject([], [{ id: 'proj-a', name: 'Project A', color: '#D49B92' }]);
    expect(result).toHaveLength(0);
  });

  it('groups tasks by project correctly', () => {
    const tasks = [
      makeTask({ id: 'task-1', projectId: 'proj-a' }),
      makeTask({ id: 'task-2', projectId: 'proj-a' }),
      makeTask({ id: 'task-3', projectId: 'proj-b', projectName: 'Project B', projectColor: '#9AB4D6' }),
    ];
    const projects = [
      { id: 'proj-a', name: 'Project A', color: '#D49B92' },
      { id: 'proj-b', name: 'Project B', color: '#9AB4D6' },
    ];
    const result = groupByProject(tasks, projects);
    expect(result).toHaveLength(2);
    const groupA = result.find((group) => group.projectId === 'proj-a');
    const groupB = result.find((group) => group.projectId === 'proj-b');
    expect(groupA?.tasks).toHaveLength(2);
    expect(groupB?.tasks).toHaveLength(1);
  });

  it('preserves project order from the projects array', () => {
    const tasks = [
      makeTask({ id: 'task-b', projectId: 'proj-b', projectName: 'Project B', projectColor: '#9AB4D6' }),
      makeTask({ id: 'task-a', projectId: 'proj-a' }),
    ];
    const projects = [
      { id: 'proj-a', name: 'Project A', color: '#D49B92' },
      { id: 'proj-b', name: 'Project B', color: '#9AB4D6' },
    ];
    const result = groupByProject(tasks, projects);
    expect(result[0]?.projectId).toBe('proj-a');
    expect(result[1]?.projectId).toBe('proj-b');
  });

  it('excludes projects with no tasks', () => {
    const tasks = [makeTask({ id: 'task-1', projectId: 'proj-a' })];
    const projects = [
      { id: 'proj-a', name: 'Project A', color: '#D49B92' },
      { id: 'proj-b', name: 'Project B', color: '#9AB4D6' },
    ];
    const result = groupByProject(tasks, projects);
    expect(result).toHaveLength(1);
    expect(result[0]?.projectId).toBe('proj-a');
  });

  it('preserves task insertion order within each group', () => {
    const tasks = [
      makeTask({ id: 'task-1', projectId: 'proj-a' }),
      makeTask({ id: 'task-2', projectId: 'proj-a' }),
      makeTask({ id: 'task-3', projectId: 'proj-a' }),
    ];
    const projects = [{ id: 'proj-a', name: 'Project A', color: '#D49B92' }];
    const result = groupByProject(tasks, projects);
    expect(result[0]?.tasks.map((task) => task.id)).toEqual(['task-1', 'task-2', 'task-3']);
  });
});

describe('parseBacklogOpen', () => {
  it('returns true when input is null', () => {
    expect(parseBacklogOpen(null)).toBe(true);
  });

  it("returns true when input is 'true'", () => {
    expect(parseBacklogOpen('true')).toBe(true);
  });

  it("returns false when input is 'false'", () => {
    expect(parseBacklogOpen('false')).toBe(false);
  });

  it('returns false for any other string', () => {
    expect(parseBacklogOpen('')).toBe(false);
    expect(parseBacklogOpen('1')).toBe(false);
    expect(parseBacklogOpen('yes')).toBe(false);
  });
});
