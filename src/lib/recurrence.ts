export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  days_of_week?: DayOfWeek[];
  day_of_month?: number;
  week_of_month?: number;
  ends: null | { on_date: string } | { after_occurrences: number };
};

const DOW_MAP: Record<DayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const SHORT_DAY_NAMES: Record<DayOfWeek, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
};

// Work entirely in UTC to avoid timezone issues with date-only values.
// fromDate is treated as UTC midnight.

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function addMonthsClamped(fromDate: Date, months: number): Date {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const day = fromDate.getUTCDate();
  const targetTotalMonths = year * 12 + month + months;
  const targetYear = Math.floor(targetTotalMonths / 12);
  const targetMonth = targetTotalMonths % 12;
  // Try to set the date; if it overflows, clamp to end of month
  const attempt = utcDate(targetYear, targetMonth, day);
  if (attempt.getUTCMonth() !== targetMonth) {
    // Overflow: go back to last day of targetMonth
    return utcDate(targetYear, targetMonth + 1, 0);
  }
  return attempt;
}

function getNthWeekdayOfMonth(year: number, month: number, dow: number, n: number): Date {
  // Find first occurrence of dow in that month
  const first = utcDate(year, month, 1);
  const firstDow = first.getUTCDay();
  let offset = dow - firstDow;
  if (offset < 0) offset += 7;
  const firstOccurrenceDay = 1 + offset;
  const nthDay = firstOccurrenceDay + (n - 1) * 7;
  return utcDate(year, month, nthDay);
}

function advanceWeekly(
  fromDate: Date,
  interval: number,
  daysOfWeek: DayOfWeek[],
): Date {
  const fromDow = fromDate.getUTCDay(); // 0=Sun
  const sortedDows = [...daysOfWeek].map((d) => DOW_MAP[d]).sort((a, b) => a - b);

  // Find next matching DOW strictly after fromDow in this week
  const nextInWeek = sortedDows.find((dow) => dow > fromDow);
  if (nextInWeek !== undefined) {
    const diff = nextInWeek - fromDow;
    return new Date(fromDate.getTime() + diff * 86400000);
  }

  // Go to next cycle: interval weeks from start of current week (Sunday=0)
  const daysSinceSunday = fromDow;
  const thisSundayMs = fromDate.getTime() - daysSinceSunday * 86400000;
  const nextCycleSundayMs = thisSundayMs + interval * 7 * 86400000;

  // First matching DOW in next cycle
  const firstDow = sortedDows[0] ?? 0;
  return new Date(nextCycleSundayMs + firstDow * 86400000);
}

export function getNextOccurrence(rule: RecurrenceRule, fromDate: Date): Date {
  const { frequency, interval } = rule;

  if (frequency === 'daily') {
    return new Date(fromDate.getTime() + interval * 86400000);
  }

  if (frequency === 'weekly') {
    if (rule.days_of_week !== undefined && rule.days_of_week.length > 0) {
      return advanceWeekly(fromDate, interval, rule.days_of_week);
    }
    return new Date(fromDate.getTime() + interval * 7 * 86400000);
  }

  if (frequency === 'monthly') {
    if (rule.day_of_month !== undefined) {
      const next = addMonthsClamped(fromDate, interval);
      const targetYear = next.getUTCFullYear();
      const targetMonth = next.getUTCMonth();
      const attempt = utcDate(targetYear, targetMonth, rule.day_of_month);
      if (attempt.getUTCMonth() !== targetMonth) {
        return utcDate(targetYear, targetMonth + 1, 0);
      }
      return attempt;
    }
    if (
      rule.week_of_month !== undefined &&
      rule.days_of_week !== undefined &&
      rule.days_of_week.length > 0
    ) {
      const next = addMonthsClamped(fromDate, interval);
      const targetYear = next.getUTCFullYear();
      const targetMonth = next.getUTCMonth();
      const dow = DOW_MAP[rule.days_of_week[0]!];
      return getNthWeekdayOfMonth(targetYear, targetMonth, dow, rule.week_of_month);
    }
    // Default: same day of month, advance months, clamp
    return addMonthsClamped(fromDate, interval);
  }

  if (frequency === 'yearly') {
    const year = fromDate.getUTCFullYear();
    const month = fromDate.getUTCMonth();
    const day = fromDate.getUTCDate();
    const newYear = year + interval;
    const attempt = utcDate(newYear, month, day);
    // Clamp Feb 29 → Feb 28 in non-leap year
    if (attempt.getUTCMonth() !== month) {
      return utcDate(newYear, month + 1, 0);
    }
    return attempt;
  }

  if (frequency === 'custom') {
    if (rule.days_of_week !== undefined && rule.days_of_week.length > 0) {
      return advanceWeekly(fromDate, interval, rule.days_of_week);
    }
    if (rule.day_of_month !== undefined || rule.week_of_month !== undefined) {
      if (rule.day_of_month !== undefined) {
        const next = addMonthsClamped(fromDate, interval);
        const targetYear = next.getUTCFullYear();
        const targetMonth = next.getUTCMonth();
        const attempt = utcDate(targetYear, targetMonth, rule.day_of_month);
        if (attempt.getUTCMonth() !== targetMonth) {
          return utcDate(targetYear, targetMonth + 1, 0);
        }
        return attempt;
      }
      if (
        rule.week_of_month !== undefined &&
        rule.days_of_week !== undefined &&
        rule.days_of_week.length > 0
      ) {
        const next = addMonthsClamped(fromDate, interval);
        const targetYear = next.getUTCFullYear();
        const targetMonth = next.getUTCMonth();
        const dow = DOW_MAP[rule.days_of_week[0]!];
        return getNthWeekdayOfMonth(targetYear, targetMonth, dow, rule.week_of_month);
      }
      return addMonthsClamped(fromDate, interval);
    }
    // Default: daily-like
    return new Date(fromDate.getTime() + interval * 86400000);
  }

  // Fallback
  return new Date(fromDate.getTime() + interval * 86400000);
}

export function getFrequencyLabel(rule: RecurrenceRule): string {
  const { frequency, interval } = rule;

  if (frequency === 'daily') {
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }

  if (frequency === 'weekly') {
    if (rule.days_of_week !== undefined && rule.days_of_week.length > 0) {
      return rule.days_of_week.map((d) => SHORT_DAY_NAMES[d]).join('/');
    }
    return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
  }

  if (frequency === 'monthly') {
    return interval === 1 ? 'Monthly' : `Every ${interval} months`;
  }

  if (frequency === 'yearly') {
    return interval === 1 ? 'Yearly' : `Every ${interval} years`;
  }

  if (frequency === 'custom') {
    if (rule.days_of_week !== undefined && rule.days_of_week.length > 0) {
      const suffix = interval > 1 ? ` (every ${interval}w)` : '';
      return rule.days_of_week.map((d) => SHORT_DAY_NAMES[d]).join('/') + suffix;
    }
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }

  return 'Custom';
}

export function getOccurrencesInRange(
  rule: RecurrenceRule,
  masterDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const results: string[] = [];
  let current = new Date(masterDate + 'T00:00:00Z');
  const rangeStartDate = new Date(rangeStart + 'T00:00:00Z');
  const rangeEndDate = new Date(rangeEnd + 'T00:00:00Z');

  // Start from the NEXT occurrence after masterDate (masterDate itself is a real DB record)
  current = getNextOccurrence(rule, current);

  // Fast-forward past occurrences before rangeStart
  let safetyA = 0;
  while (current < rangeStartDate && safetyA < 5000) {
    safetyA++;
    const next = getNextOccurrence(rule, current);
    if (next.getTime() <= current.getTime()) return results;
    current = next;
  }

  // Collect occurrences inside [rangeStart, rangeEnd]
  let safetyB = 0;
  while (current <= rangeEndDate && safetyB < 500) {
    safetyB++;
    results.push(current.toISOString().slice(0, 10));
    const next = getNextOccurrence(rule, current);
    if (next.getTime() <= current.getTime()) break;
    current = next;
  }

  return results;
}

export function isRecurrenceComplete(
  rule: RecurrenceRule,
  completionCount: number,
  nextDate: Date,
): boolean {
  const { ends } = rule;
  if (ends === null) return false;
  if ('after_occurrences' in ends) return completionCount >= ends.after_occurrences;
  if ('on_date' in ends) return nextDate > new Date(ends.on_date);
  return false;
}
