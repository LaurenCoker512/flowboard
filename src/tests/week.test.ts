import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekDays,
  formatWeekHeader,
  nearestThirtyMin,
  shiftDatePreservingTime,
  computeOverlapGroups,
} from '@/lib/week-utils';
import type { WeekTask } from '@/lib/week-utils';

const TODAY = '2026-05-24';

function makeWeekTask(overrides: Partial<WeekTask> = {}): WeekTask {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'proj-1',
    projectName: 'Test Project',
    projectColor: '#D49B92',
    priority: 'can_wait',
    status: 'backlog',
    date: TODAY,
    startAt: null,
    endAt: null,
    isRecurring: false,
    recurrenceRule: null,
    recurringMasterId: null,
    description: null,
    ...overrides,
  };
}

describe('getWeekStart', () => {
  it('returns the Sunday of the week for Sunday start', () => {
    // 2026-05-20 is a Wednesday; Sunday of that week is 2026-05-17
    const anchor = new Date('2026-05-20T12:00:00');
    const start = getWeekStart(anchor, 'sunday');
    expect(start.toISOString().slice(0, 10)).toBe('2026-05-17');
  });

  it('returns the Monday of the week for Monday start', () => {
    // 2026-05-20 is a Wednesday; Monday of that week is 2026-05-18
    const anchor = new Date('2026-05-20T12:00:00');
    const start = getWeekStart(anchor, 'monday');
    expect(start.toISOString().slice(0, 10)).toBe('2026-05-18');
  });

  it('handles Sunday anchor with Monday start (goes back to previous Monday)', () => {
    // 2026-05-17 is a Sunday; Monday start → should be 2026-05-11 (prev Monday)
    const anchor = new Date('2026-05-17T12:00:00');
    const start = getWeekStart(anchor, 'monday');
    expect(start.toISOString().slice(0, 10)).toBe('2026-05-11');
  });

  it('handles Monday anchor with Monday start (same day)', () => {
    const anchor = new Date('2026-05-18T12:00:00');
    const start = getWeekStart(anchor, 'monday');
    expect(start.toISOString().slice(0, 10)).toBe('2026-05-18');
  });
});

describe('getWeekDays', () => {
  it('returns 7 days for Sunday start', () => {
    const anchor = new Date('2026-05-20T12:00:00');
    const days = getWeekDays(anchor, 'sunday', TODAY);
    expect(days).toHaveLength(7);
    expect(days[0]!.dateStr).toBe('2026-05-17');
    expect(days[6]!.dateStr).toBe('2026-05-23');
    expect(days[0]!.dayName).toBe('Sun');
    expect(days[6]!.dayName).toBe('Sat');
  });

  it('returns 7 days for Monday start', () => {
    const anchor = new Date('2026-05-20T12:00:00');
    const days = getWeekDays(anchor, 'monday', TODAY);
    expect(days).toHaveLength(7);
    expect(days[0]!.dateStr).toBe('2026-05-18');
    expect(days[6]!.dateStr).toBe('2026-05-24');
    expect(days[0]!.dayName).toBe('Mon');
    expect(days[6]!.dayName).toBe('Sun');
  });

  it('marks today correctly', () => {
    const anchor = new Date('2026-05-24T12:00:00');
    const days = getWeekDays(anchor, 'monday', '2026-05-24');
    const todayDay = days.find((d) => d.isToday);
    expect(todayDay).not.toBeUndefined();
    expect(todayDay!.dateStr).toBe('2026-05-24');
  });

  it('marks no day as today when today is outside the week', () => {
    const anchor = new Date('2026-05-20T12:00:00');
    const days = getWeekDays(anchor, 'monday', '2026-06-01');
    expect(days.every((d) => !d.isToday)).toBe(true);
  });

  it('each day has correct dayNum', () => {
    const anchor = new Date('2026-05-18T12:00:00');
    const days = getWeekDays(anchor, 'monday', TODAY);
    expect(days[0]!.dayNum).toBe(18);
    expect(days[1]!.dayNum).toBe(19);
    expect(days[6]!.dayNum).toBe(24);
  });
});

describe('formatWeekHeader', () => {
  it('formats same-month range correctly', () => {
    const anchor = new Date('2026-05-20T12:00:00');
    const days = getWeekDays(anchor, 'sunday', TODAY);
    expect(formatWeekHeader(days)).toBe('May 17 – 23, 2026');
  });

  it('formats cross-month range correctly', () => {
    // Week starting Apr 27 (Mon), ending May 3 (Sun)
    const anchor = new Date('2026-04-29T12:00:00');
    const days = getWeekDays(anchor, 'monday', TODAY);
    const header = formatWeekHeader(days);
    expect(header).toMatch(/^Apr \d+ – May \d+, 2026$/);
  });
});

describe('nearestThirtyMin', () => {
  it('returns same time when already on 30-min boundary', () => {
    const d = new Date('2026-05-24T10:00:00');
    const result = nearestThirtyMin(d);
    expect(result.getMinutes()).toBe(0);
    expect(result.getHours()).toBe(10);
  });

  it('rounds up to next 30-min when 13 minutes past', () => {
    const d = new Date('2026-05-24T10:13:00');
    const result = nearestThirtyMin(d);
    expect(result.getMinutes()).toBe(30);
    expect(result.getHours()).toBe(10);
  });

  it('rounds up to next hour when 31 minutes past', () => {
    const d = new Date('2026-05-24T10:31:00');
    const result = nearestThirtyMin(d);
    expect(result.getMinutes()).toBe(0);
    expect(result.getHours()).toBe(11);
  });

  it('handles :30 boundary (no change)', () => {
    const d = new Date('2026-05-24T10:30:00');
    const result = nearestThirtyMin(d);
    expect(result.getMinutes()).toBe(30);
    expect(result.getHours()).toBe(10);
  });

  it('rounds 29 minutes past to :30', () => {
    const d = new Date('2026-05-24T10:29:00');
    const result = nearestThirtyMin(d);
    expect(result.getMinutes()).toBe(30);
    expect(result.getHours()).toBe(10);
  });
});

describe('shiftDatePreservingTime', () => {
  it('updates the date while preserving the time', () => {
    const startAt = new Date('2026-05-20T14:30:00');
    const result = shiftDatePreservingTime(startAt, null, '2026-05-22');
    expect(result.startAt.getHours()).toBe(14);
    expect(result.startAt.getMinutes()).toBe(30);
    expect(result.startAt.getDate()).toBe(22);
    expect(result.startAt.getMonth()).toBe(4); // May = 4
    expect(result.endAt).toBeNull();
  });

  it('shifts endAt preserving the duration', () => {
    const startAt = new Date('2026-05-20T14:00:00');
    const endAt = new Date('2026-05-20T15:30:00'); // 90-min duration
    const result = shiftDatePreservingTime(startAt, endAt, '2026-05-23');
    expect(result.startAt.getHours()).toBe(14);
    expect(result.startAt.getDate()).toBe(23);
    expect(result.endAt).not.toBeNull();
    const durationMs = result.endAt!.getTime() - result.startAt.getTime();
    expect(durationMs).toBe(90 * 60 * 1000);
  });

  it('returns null endAt when original endAt is null', () => {
    const startAt = new Date('2026-05-20T09:00:00');
    const result = shiftDatePreservingTime(startAt, null, '2026-05-25');
    expect(result.endAt).toBeNull();
  });
});

describe('computeOverlapGroups', () => {
  it('returns empty array for empty input', () => {
    expect(computeOverlapGroups([])).toHaveLength(0);
  });

  it('returns separate groups for non-overlapping events', () => {
    const tasks = [
      makeWeekTask({
        id: '1',
        startAt: new Date('2026-05-24T09:00:00'),
        endAt: new Date('2026-05-24T10:00:00'),
      }),
      makeWeekTask({
        id: '2',
        startAt: new Date('2026-05-24T11:00:00'),
        endAt: new Date('2026-05-24T12:00:00'),
      }),
    ];
    const groups = computeOverlapGroups(tasks);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.events).toHaveLength(1);
    expect(groups[1]!.events).toHaveLength(1);
  });

  it('groups overlapping events together', () => {
    const tasks = [
      makeWeekTask({
        id: '1',
        startAt: new Date('2026-05-24T09:00:00'),
        endAt: new Date('2026-05-24T10:30:00'),
      }),
      makeWeekTask({
        id: '2',
        startAt: new Date('2026-05-24T10:00:00'),
        endAt: new Date('2026-05-24T11:00:00'),
      }),
    ];
    const groups = computeOverlapGroups(tasks);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.events).toHaveLength(2);
  });

  it('a single event forms a group by itself', () => {
    const tasks = [
      makeWeekTask({
        id: '1',
        startAt: new Date('2026-05-24T10:00:00'),
        endAt: new Date('2026-05-24T11:00:00'),
      }),
    ];
    const groups = computeOverlapGroups(tasks);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.events[0]!.id).toBe('1');
  });

  it('uses 1-hour default duration for events without endAt', () => {
    // Event 1: 09:00 (no endAt → defaults to 10:00)
    // Event 2: 09:30 → overlaps with event 1
    const tasks = [
      makeWeekTask({
        id: '1',
        startAt: new Date('2026-05-24T09:00:00'),
        endAt: null,
      }),
      makeWeekTask({
        id: '2',
        startAt: new Date('2026-05-24T09:30:00'),
        endAt: null,
      }),
    ];
    const groups = computeOverlapGroups(tasks);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.events).toHaveLength(2);
  });

  it('does not mutate input array', () => {
    const tasks = [
      makeWeekTask({ id: '2', startAt: new Date('2026-05-24T11:00:00') }),
      makeWeekTask({ id: '1', startAt: new Date('2026-05-24T09:00:00') }),
    ];
    const original = [...tasks];
    computeOverlapGroups(tasks);
    expect(tasks[0]!.id).toBe(original[0]!.id);
  });
});
