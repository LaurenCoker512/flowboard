import { describe, it, expect } from 'vitest';
import { validateTaskTitle } from '@/lib/task-actions';
import { resolveDefaultProject, isTaskDirty, type TaskFormValues } from '@/lib/task-defaults';

describe('validateTaskTitle', () => {
  it('returns an error for an empty string', () => {
    expect(validateTaskTitle('')).not.toBeNull();
  });

  it('returns an error for a whitespace-only string', () => {
    expect(validateTaskTitle('   ')).not.toBeNull();
  });

  it('returns an error for a title of 256 characters', () => {
    expect(validateTaskTitle('a'.repeat(256))).not.toBeNull();
  });

  it('accepts a title of exactly 255 characters', () => {
    expect(validateTaskTitle('a'.repeat(255))).toBeNull();
  });

  it('accepts a normal title', () => {
    expect(validateTaskTitle('Buy groceries')).toBeNull();
  });

  it('returns an error for null', () => {
    expect(validateTaskTitle(null)).not.toBeNull();
  });

  it('returns an error for undefined', () => {
    expect(validateTaskTitle(undefined)).not.toBeNull();
  });

  it('returns an error for a number', () => {
    expect(validateTaskTitle(42)).not.toBeNull();
  });
});

describe('resolveDefaultProject', () => {
  const projects = [
    { id: 'aaa' },
    { id: 'bbb' },
    { id: 'ccc' },
  ];

  it('returns lastUsedId when it exists in projects', () => {
    expect(resolveDefaultProject('bbb', projects, 'ccc')).toBe('bbb');
  });

  it('returns settingsDefaultId when lastUsedId is not in projects', () => {
    expect(resolveDefaultProject('zzz', projects, 'ccc')).toBe('ccc');
  });

  it('returns projects[0].id when neither id is in projects', () => {
    expect(resolveDefaultProject('zzz', projects, 'yyy')).toBe('aaa');
  });

  it('returns empty string when there are no projects', () => {
    expect(resolveDefaultProject('aaa', [], 'bbb')).toBe('');
  });

  it('returns projects[0].id when lastUsedId and settingsDefaultId are both null', () => {
    expect(resolveDefaultProject(null, projects, null)).toBe('aaa');
  });
});

describe('isTaskDirty', () => {
  const base: TaskFormValues = {
    title: 'My task',
    projectId: 'aaa',
    priority: 'can_wait',
    status: 'backlog',
    date: '2026-05-23',
    startTime: '09:00',
    endTime: '10:00',
    description: 'Details here',
  };

  it('returns false for identical values', () => {
    expect(isTaskDirty(base, { ...base })).toBe(false);
  });

  it('returns true when title changed', () => {
    expect(isTaskDirty(base, { ...base, title: 'Different title' })).toBe(true);
  });

  it('returns true when priority changed', () => {
    expect(isTaskDirty(base, { ...base, priority: 'must_do' })).toBe(true);
  });

  it('returns true when date changed', () => {
    expect(isTaskDirty(base, { ...base, date: '2026-06-01' })).toBe(true);
  });

  it('returns true when description changed', () => {
    expect(isTaskDirty(base, { ...base, description: 'New details' })).toBe(true);
  });
});
