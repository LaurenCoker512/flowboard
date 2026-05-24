import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildTasksCSV,
  validateClearThreshold,
  computeClearThreshold,
  type CsvTaskRow,
} from '@/lib/settings-utils';

function makeRow(overrides: Partial<CsvTaskRow> = {}): CsvTaskRow {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'proj-1',
    priority: 'can_wait',
    status: 'backlog',
    isArchived: false,
    date: null,
    startAt: null,
    endAt: null,
    isRecurring: false,
    completionCount: 0,
    completedAt: null,
    description: null,
    backlogOrder: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// --- buildTasksCSV ---

describe('buildTasksCSV', () => {
  it('produces the correct header row', () => {
    const csv = buildTasksCSV([]);
    const header = csv.split('\n')[0]!;
    expect(header).toBe(
      'id,title,project_id,priority,status,is_archived,date,start_at,end_at,is_recurring,completion_count,completed_at,description,backlog_order,created_at,updated_at',
    );
  });

  it('produces one data row per task', () => {
    const csv = buildTasksCSV([makeRow({ id: 'a' }), makeRow({ id: 'b' })]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('returns just the header when given an empty array', () => {
    const csv = buildTasksCSV([]);
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('encodes all fields in column order', () => {
    const csv = buildTasksCSV([
      makeRow({
        id: 'abc',
        title: 'My task',
        projectId: 'proj-x',
        priority: 'must_do',
        status: 'in_progress',
        isArchived: true,
        date: '2026-05-15',
        startAt: '2026-05-15T10:00:00.000Z',
        endAt: '2026-05-15T11:00:00.000Z',
        isRecurring: true,
        completionCount: 3,
        completedAt: '2026-05-15T11:00:00.000Z',
        description: 'A description',
        backlogOrder: 'a0',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      }),
    ]);
    const row = csv.split('\n')[1]!;
    expect(row).toBe(
      'abc,My task,proj-x,must_do,in_progress,true,2026-05-15,2026-05-15T10:00:00.000Z,2026-05-15T11:00:00.000Z,true,3,2026-05-15T11:00:00.000Z,A description,a0,2026-01-01T00:00:00.000Z,2026-05-01T00:00:00.000Z',
    );
  });

  it('represents null optional fields as empty strings', () => {
    const csv = buildTasksCSV([makeRow()]);
    const row = csv.split('\n')[1]!;
    const cols = row.split(',');
    expect(cols[6]).toBe('');  // date
    expect(cols[7]).toBe('');  // start_at
    expect(cols[8]).toBe('');  // end_at
    expect(cols[11]).toBe(''); // completed_at
    expect(cols[12]).toBe(''); // description
    expect(cols[13]).toBe(''); // backlog_order
  });

  it('wraps titles containing commas in double quotes', () => {
    const csv = buildTasksCSV([makeRow({ title: 'Buy milk, bread' })]);
    expect(csv).toContain('"Buy milk, bread"');
  });

  it('escapes double quotes inside quoted fields', () => {
    const csv = buildTasksCSV([makeRow({ title: 'She said "hello"' })]);
    expect(csv).toContain('"She said ""hello"""');
  });

  it('wraps fields containing newlines in double quotes', () => {
    const csv = buildTasksCSV([makeRow({ description: 'Line one\nLine two' })]);
    expect(csv).toContain('"Line one\nLine two"');
  });

  it('timestamps in createdAt / updatedAt are ISO-8601 strings', () => {
    const csv = buildTasksCSV([
      makeRow({
        createdAt: '2026-01-15T08:30:00.000Z',
        updatedAt: '2026-03-20T14:00:00.000Z',
      }),
    ]);
    expect(csv).toContain('2026-01-15T08:30:00.000Z');
    expect(csv).toContain('2026-03-20T14:00:00.000Z');
  });
});

// --- validateClearThreshold ---

describe('validateClearThreshold', () => {
  it('returns the number for a valid positive integer', () => {
    expect(validateClearThreshold(30)).toBe(30);
    expect(validateClearThreshold(1)).toBe(1);
    expect(validateClearThreshold(36500)).toBe(36500);
  });

  it('accepts numeric strings', () => {
    expect(validateClearThreshold('90')).toBe(90);
    expect(validateClearThreshold('7')).toBe(7);
  });

  it('returns null for zero', () => {
    expect(validateClearThreshold(0)).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(validateClearThreshold(-1)).toBeNull();
    expect(validateClearThreshold(-100)).toBeNull();
  });

  it('returns null for non-integer decimals', () => {
    expect(validateClearThreshold(1.5)).toBeNull();
    expect(validateClearThreshold(30.7)).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(validateClearThreshold('abc')).toBeNull();
    expect(validateClearThreshold('')).toBeNull();
  });

  it('returns null for null and undefined', () => {
    expect(validateClearThreshold(null)).toBeNull();
    expect(validateClearThreshold(undefined)).toBeNull();
  });

  it('returns null for values exceeding 36500', () => {
    expect(validateClearThreshold(36501)).toBeNull();
  });
});

// --- computeClearThreshold ---

describe('computeClearThreshold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a date exactly N days before now', () => {
    const threshold = computeClearThreshold(30);
    const expected = new Date(new Date('2026-05-24T12:00:00.000Z').getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(threshold.toISOString()).toBe(expected.toISOString());
  });

  it('returns a date 1 day before now for threshold of 1', () => {
    const threshold = computeClearThreshold(1);
    const expected = new Date(new Date('2026-05-24T12:00:00.000Z').getTime() - 1 * 24 * 60 * 60 * 1000);
    expect(threshold.toISOString()).toBe(expected.toISOString());
  });

  it('returns a date 90 days before now for threshold of 90', () => {
    const threshold = computeClearThreshold(90);
    const expected = new Date(new Date('2026-05-24T12:00:00.000Z').getTime() - 90 * 24 * 60 * 60 * 1000);
    expect(threshold.toISOString()).toBe(expected.toISOString());
  });
});
