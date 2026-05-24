import { describe, it, expect } from 'vitest';
import {
  users,
  passwordResetTokens,
  projects,
  tasks,
  settings,
  priorityEnum,
  statusEnum,
  densityEnum,
  weekStartDayEnum,
  defaultViewEnum,
} from '@/db/schema';
import type { Task, Project, User, Settings, PasswordResetToken } from '@/types';

describe('schema — enum values', () => {
  it('priorityEnum has correct values', () => {
    expect(priorityEnum.enumValues).toEqual(['must_do', 'can_wait', 'fun']);
  });

  it('statusEnum has correct values', () => {
    expect(statusEnum.enumValues).toEqual(['backlog', 'up_next', 'in_progress', 'done']);
  });

  it('densityEnum has correct values', () => {
    expect(densityEnum.enumValues).toEqual(['compact', 'default', 'roomy']);
  });

  it('weekStartDayEnum has correct values', () => {
    expect(weekStartDayEnum.enumValues).toEqual(['sunday', 'monday']);
  });

  it('defaultViewEnum has correct values', () => {
    expect(defaultViewEnum.enumValues).toEqual(['board', 'week', 'month']);
  });
});

describe('schema — table column presence', () => {
  it('users table has required columns', () => {
    const cols = Object.keys(users);
    expect(cols).toContain('id');
    expect(cols).toContain('username');
    expect(cols).toContain('email');
    expect(cols).toContain('passwordHash');
    expect(cols).toContain('createdAt');
  });

  it('tasks table has all spec columns', () => {
    const cols = Object.keys(tasks);
    const required = [
      'id', 'title', 'projectId', 'priority', 'status', 'isArchived',
      'date', 'startAt', 'endAt', 'isRecurring', 'recurrenceRule',
      'completionCount', 'completedAt', 'recurringMasterId',
      'recurringOccurrenceDate', 'backlogOrder', 'description',
      'createdAt', 'updatedAt',
    ];
    for (const col of required) {
      expect(cols).toContain(col);
    }
  });

  it('settings table has density and quietEvenings', () => {
    const cols = Object.keys(settings);
    expect(cols).toContain('density');
    expect(cols).toContain('quietEvenings');
  });

  it('passwordResetTokens table has tokenHash and usedAt', () => {
    const cols = Object.keys(passwordResetTokens);
    expect(cols).toContain('tokenHash');
    expect(cols).toContain('usedAt');
    expect(cols).toContain('expiresAt');
  });
});

describe('inferred types — shape validation', () => {
  it('Task type has expected fields', () => {
    // Compile-time check via assignment — if shape is wrong, tsc catches it
    const taskShape: Pick<Task, 'id' | 'title' | 'priority' | 'status' | 'isArchived'> = {
      id: 'uuid-here',
      title: 'Test task',
      priority: 'must_do',
      status: 'backlog',
      isArchived: false,
    };
    expect(taskShape.priority).toBe('must_do');
    expect(taskShape.status).toBe('backlog');
  });

  it('Settings type has density field typed correctly', () => {
    const settingsShape: Pick<Settings, 'density' | 'quietEvenings' | 'weekStartDay'> = {
      density: 'default',
      quietEvenings: false,
      weekStartDay: 'sunday',
    };
    expect(settingsShape.density).toBe('default');
  });

  it('Project type has isArchived field', () => {
    const projectShape: Pick<Project, 'id' | 'name' | 'color' | 'isArchived'> = {
      id: 'uuid-here',
      name: 'My project',
      color: '#D49B92',
      isArchived: false,
    };
    expect(projectShape.isArchived).toBe(false);
  });
});
