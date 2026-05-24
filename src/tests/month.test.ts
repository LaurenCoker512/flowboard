import { describe, it, expect } from 'vitest';
import {
  getMonthGrid,
  getMonthRange,
  formatMonthHeader,
  getMonthDayLabels,
  formatDayPopoverHeader,
} from '@/lib/month-utils';

const TODAY = '2026-05-24';

describe('formatMonthHeader', () => {
  it('formats correctly for May', () => {
    expect(formatMonthHeader(2026, 4)).toBe('May 2026');
  });

  it('formats correctly for January', () => {
    expect(formatMonthHeader(2027, 0)).toBe('January 2027');
  });

  it('formats correctly for December', () => {
    expect(formatMonthHeader(2025, 11)).toBe('December 2025');
  });
});

describe('getMonthDayLabels', () => {
  it('starts with Sun for sunday start', () => {
    const labels = getMonthDayLabels('sunday');
    expect(labels[0]).toBe('Sun');
    expect(labels[6]).toBe('Sat');
  });

  it('starts with Mon for monday start', () => {
    const labels = getMonthDayLabels('monday');
    expect(labels[0]).toBe('Mon');
    expect(labels[6]).toBe('Sun');
  });
});

describe('getMonthRange', () => {
  it('returns correct range for May 2026', () => {
    const { startDate, endDate } = getMonthRange(2026, 4);
    expect(startDate).toBe('2026-05-01');
    expect(endDate).toBe('2026-05-31');
  });

  it('returns correct range for February 2024 (leap year)', () => {
    const { startDate, endDate } = getMonthRange(2024, 1);
    expect(startDate).toBe('2024-02-01');
    expect(endDate).toBe('2024-02-29');
  });

  it('returns correct range for February 2023 (non-leap)', () => {
    const { startDate, endDate } = getMonthRange(2023, 1);
    expect(startDate).toBe('2023-02-01');
    expect(endDate).toBe('2023-02-28');
  });

  it('returns correct range for December 2026', () => {
    const { startDate, endDate } = getMonthRange(2026, 11);
    expect(startDate).toBe('2026-12-01');
    expect(endDate).toBe('2026-12-31');
  });
});

describe('getMonthGrid', () => {
  it('returns 5 or 6 weeks for any month', () => {
    const weeks = getMonthGrid(2026, 4, 'sunday', TODAY);
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    expect(weeks.length).toBeLessThanOrEqual(6);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it('every row has exactly 7 cells', () => {
    const weeks = getMonthGrid(2026, 4, 'monday', TODAY);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it('May 2026 Sunday start: grid starts on Apr 26 (Sunday)', () => {
    // May 1 2026 is a Friday (dow=5), Sunday offset=5
    const weeks = getMonthGrid(2026, 4, 'sunday', TODAY);
    expect(weeks[0]![0]!.dateStr).toBe('2026-04-26');
    expect(weeks[0]![0]!.isCurrentMonth).toBe(false);
  });

  it('May 2026 Monday start: grid starts on Apr 27 (Monday)', () => {
    // May 1 2026 is a Friday (dow=5), Monday offset=4
    const weeks = getMonthGrid(2026, 4, 'monday', TODAY);
    expect(weeks[0]![0]!.dateStr).toBe('2026-04-27');
    expect(weeks[0]![0]!.isCurrentMonth).toBe(false);
  });

  it('May 2026 Monday start: grid ends on May 31 (Sunday = last slot)', () => {
    // May 31 is a Sunday (dow=0) — for Monday start, Sunday is the last slot, trailing=0
    const weeks = getMonthGrid(2026, 4, 'monday', TODAY);
    const lastWeek = weeks[weeks.length - 1]!;
    expect(lastWeek[6]!.dateStr).toBe('2026-05-31');
    expect(lastWeek[6]!.isCurrentMonth).toBe(true);
    expect(weeks.length).toBe(5);
  });

  it('May 2026 Sunday start: grid ends on Jun 6 (Saturday)', () => {
    // May 31 is a Sunday (dow=0), trailing = 6 - 0 = 6
    const weeks = getMonthGrid(2026, 4, 'sunday', TODAY);
    const lastWeek = weeks[weeks.length - 1]!;
    expect(lastWeek[6]!.dateStr).toBe('2026-06-06');
    expect(lastWeek[6]!.isCurrentMonth).toBe(false);
    expect(weeks.length).toBe(6);
  });

  it('marks today correctly in current month', () => {
    const weeks = getMonthGrid(2026, 4, 'monday', TODAY);
    const allCells = weeks.flat();
    const todayCell = allCells.find((c) => c.isToday);
    expect(todayCell).not.toBeUndefined();
    expect(todayCell!.dateStr).toBe('2026-05-24');
  });

  it('does not mark out-of-month cell as today even when dateStr matches', () => {
    // Use a today value that falls in the previous month for this grid
    const weeks = getMonthGrid(2026, 4, 'sunday', '2026-04-26');
    const allCells = weeks.flat();
    // Apr 26 appears in the grid but is not current month
    const cell = allCells.find((c) => c.dateStr === '2026-04-26');
    expect(cell).not.toBeUndefined();
    expect(cell!.isCurrentMonth).toBe(false);
    expect(cell!.isToday).toBe(false);
  });

  it('isCurrentMonth is false for cells outside the month', () => {
    const weeks = getMonthGrid(2026, 4, 'sunday', TODAY);
    const allCells = weeks.flat();
    const aprilCells = allCells.filter((c) => c.dateStr.startsWith('2026-04'));
    const juneCells = allCells.filter((c) => c.dateStr.startsWith('2026-06'));
    for (const cell of [...aprilCells, ...juneCells]) {
      expect(cell.isCurrentMonth).toBe(false);
    }
  });

  it('total current-month cells equals days in month', () => {
    const weeks = getMonthGrid(2026, 4, 'monday', TODAY);
    const currentMonthCells = weeks.flat().filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(31); // May has 31 days
  });

  it('handles February 2023 correctly (28 days, non-leap)', () => {
    const weeks = getMonthGrid(2023, 1, 'monday', '2023-02-01');
    const currentMonthCells = weeks.flat().filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(28);
  });

  it('handles February 2024 correctly (29 days, leap year)', () => {
    const weeks = getMonthGrid(2024, 1, 'monday', '2024-02-01');
    const currentMonthCells = weeks.flat().filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(29);
  });
});

describe('formatDayPopoverHeader', () => {
  it('formats a Friday correctly', () => {
    // 2026-05-15 is a Friday
    expect(formatDayPopoverHeader('2026-05-15')).toBe('Friday, May 15');
  });

  it('formats a Sunday correctly', () => {
    // 2026-05-03 is a Sunday
    expect(formatDayPopoverHeader('2026-05-03')).toBe('Sunday, May 3');
  });
});
