import { describe, it, expect } from 'vitest';
import { getNextOccurrence, getFrequencyLabel, isRecurrenceComplete } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';

describe('getNextOccurrence', () => {
  it('daily interval=1: advances by 1 day', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1, ends: null };
    const from = new Date('2026-05-23');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-24');
  });

  it('daily interval=3: advances by 3 days', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 3, ends: null };
    const from = new Date('2026-05-23');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-26');
  });

  it('weekly no days_of_week, interval=1: advances by 7 days', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, ends: null };
    const from = new Date('2026-05-23');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-30');
  });

  it('weekly no days_of_week, interval=2: advances by 14 days', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 2, ends: null };
    const from = new Date('2026-05-23');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-06');
  });

  it('weekly with days_of_week=[mon,wed,fri], from Friday: goes to next Monday', () => {
    // May 22 2026 is a Friday (dow=5)
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      days_of_week: ['mon', 'wed', 'fri'],
      ends: null,
    };
    const from = new Date('2026-05-22'); // Friday
    const next = getNextOccurrence(rule, from);
    // From Fri, no matching DOW after Fri in current week. Next cycle starts Mon May 25.
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-25');
  });

  it('weekly with days_of_week=[mon,wed,fri], from Wednesday: goes to Friday', () => {
    // May 20 2026 is a Wednesday
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      days_of_week: ['mon', 'wed', 'fri'],
      ends: null,
    };
    const from = new Date('2026-05-20'); // Wednesday
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-22');
  });

  it('monthly day_of_month=31, interval=1 from Jan 31: clamps to Feb 28', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      interval: 1,
      day_of_month: 31,
      ends: null,
    };
    const from = new Date('2026-01-31');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('monthly day_of_month=15, interval=1 from Feb 15: goes to Mar 15', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      interval: 1,
      day_of_month: 15,
      ends: null,
    };
    const from = new Date('2026-02-15');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('monthly week_of_month=2, days_of_week=[tue], interval=1: 2nd Tuesday of next month', () => {
    // From May 2026, next is June 2026. Find 2nd Tuesday of June 2026.
    // June 1 2026 is a Monday (dow=1). First Tuesday is June 2. Second Tuesday is June 9.
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      interval: 1,
      week_of_month: 2,
      days_of_week: ['tue'],
      ends: null,
    };
    const from = new Date('2026-05-01');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-09');
  });

  it('yearly interval=1: advances by 1 year', () => {
    const rule: RecurrenceRule = { frequency: 'yearly', interval: 1, ends: null };
    const from = new Date('2026-05-23');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2027-05-23');
  });

  it('yearly: clamps Feb 29 to Feb 28 in non-leap year', () => {
    const rule: RecurrenceRule = { frequency: 'yearly', interval: 1, ends: null };
    const from = new Date('2024-02-29'); // 2024 is a leap year
    const next = getNextOccurrence(rule, from);
    // 2025 is not a leap year
    expect(next.toISOString().slice(0, 10)).toBe('2025-02-28');
  });

  it('custom with days_of_week: behaves like weekly', () => {
    const rule: RecurrenceRule = {
      frequency: 'custom',
      interval: 1,
      days_of_week: ['mon', 'wed'],
      ends: null,
    };
    // From Tuesday May 19: next matching day is Wednesday May 20
    const from = new Date('2026-05-19'); // Tuesday
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-20');
  });

  it('custom with day_of_month: behaves like monthly', () => {
    const rule: RecurrenceRule = {
      frequency: 'custom',
      interval: 1,
      day_of_month: 10,
      ends: null,
    };
    const from = new Date('2026-05-10');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-10');
  });

  it('custom without days_of_week or day_of_month: behaves like daily', () => {
    const rule: RecurrenceRule = { frequency: 'custom', interval: 2, ends: null };
    const from = new Date('2026-05-23');
    const next = getNextOccurrence(rule, from);
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-25');
  });
});

describe('getFrequencyLabel', () => {
  it('daily interval=1: returns "Daily"', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Daily');
  });

  it('daily interval=3: returns "Every 3 days"', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 3, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Every 3 days');
  });

  it('weekly interval=1, no days_of_week: returns "Weekly"', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Weekly');
  });

  it('weekly interval=2, no days_of_week: returns "Every 2 weeks"', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 2, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Every 2 weeks');
  });

  it('weekly with days_of_week=[mon,wed,fri]: returns "Mon/Wed/Fri"', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      days_of_week: ['mon', 'wed', 'fri'],
      ends: null,
    };
    expect(getFrequencyLabel(rule)).toBe('Mon/Wed/Fri');
  });

  it('monthly interval=1: returns "Monthly"', () => {
    const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Monthly');
  });

  it('monthly interval=3: returns "Every 3 months"', () => {
    const rule: RecurrenceRule = { frequency: 'monthly', interval: 3, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Every 3 months');
  });

  it('yearly interval=1: returns "Yearly"', () => {
    const rule: RecurrenceRule = { frequency: 'yearly', interval: 1, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Yearly');
  });

  it('yearly interval=2: returns "Every 2 years"', () => {
    const rule: RecurrenceRule = { frequency: 'yearly', interval: 2, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Every 2 years');
  });

  it('custom with days_of_week: returns day names joined by "/"', () => {
    const rule: RecurrenceRule = {
      frequency: 'custom',
      interval: 1,
      days_of_week: ['mon', 'fri'],
      ends: null,
    };
    expect(getFrequencyLabel(rule)).toBe('Mon/Fri');
  });

  it('custom without days_of_week: returns "Custom"', () => {
    const rule: RecurrenceRule = { frequency: 'custom', interval: 1, ends: null };
    expect(getFrequencyLabel(rule)).toBe('Custom');
  });
});

describe('isRecurrenceComplete', () => {
  const baseRule: RecurrenceRule = { frequency: 'daily', interval: 1, ends: null };

  it('ends: null always returns false', () => {
    expect(
      isRecurrenceComplete(baseRule, 100, new Date('2030-01-01')),
    ).toBe(false);
  });

  it('ends.after_occurrences=5, count=5: returns true', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      ends: { after_occurrences: 5 },
    };
    expect(isRecurrenceComplete(rule, 5, new Date('2026-06-01'))).toBe(true);
  });

  it('ends.after_occurrences=5, count=4: returns false', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      ends: { after_occurrences: 5 },
    };
    expect(isRecurrenceComplete(rule, 4, new Date('2026-06-01'))).toBe(false);
  });

  it('ends.on_date="2026-05-31", nextDate=June 1 2026: returns true', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      ends: { on_date: '2026-05-31' },
    };
    expect(isRecurrenceComplete(rule, 0, new Date('2026-06-01'))).toBe(true);
  });

  it('ends.on_date="2026-05-31", nextDate=May 31 2026: returns false (not strictly after)', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      ends: { on_date: '2026-05-31' },
    };
    expect(isRecurrenceComplete(rule, 0, new Date('2026-05-31'))).toBe(false);
  });

  it('ends.after_occurrences=10, count=0: returns false', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      ends: { after_occurrences: 10 },
    };
    expect(isRecurrenceComplete(rule, 0, new Date('2026-06-01'))).toBe(false);
  });
});
