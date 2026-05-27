const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DAY_ABBREVS_SUNDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_ABBREVS_MONDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type MonthCell = {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type MonthTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  isRecurring: boolean;
  recurrenceRule: unknown;
  recurringMasterId: string | null;
  description: string | null;
  isProjected?: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatMonthHeader(year: number, month: number): string {
  return `${MONTH_FULL_NAMES[month]} ${year}`;
}

export function getMonthDayLabels(weekStart: 'sunday' | 'monday'): readonly string[] {
  return weekStart === 'sunday' ? DAY_ABBREVS_SUNDAY : DAY_ABBREVS_MONDAY;
}

export function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { startDate: toDateStr(firstDay), endDate: toDateStr(lastDay) };
}

export function getMonthGrid(
  year: number,
  month: number,
  weekStart: 'sunday' | 'monday',
  today: string,
): MonthCell[][] {
  const firstDay = new Date(year, month, 1);
  const dow = firstDay.getDay();

  // Days before the 1st needed to reach the start of the first grid row
  const offset = weekStart === 'sunday' ? dow : (dow === 0 ? 6 : dow - 1);

  const gridStart = new Date(year, month, 1 - offset);

  const lastDay = new Date(year, month + 1, 0);
  const lastDow = lastDay.getDay();

  // Days after the last day needed to complete the final grid row
  const trailing = weekStart === 'sunday'
    ? (lastDow === 6 ? 0 : 6 - lastDow)
    : (lastDow === 0 ? 0 : 7 - lastDow);

  const totalCells = offset + lastDay.getDate() + trailing;
  const numWeeks = Math.ceil(totalCells / 7);

  const weeks: MonthCell[][] = [];
  for (let w = 0; w < numWeeks; w++) {
    const week: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + w * 7 + d);
      const dateStr = toDateStr(cellDate);
      const isCurrentMonth = cellDate.getMonth() === month && cellDate.getFullYear() === year;
      week.push({
        dateStr,
        dayNum: cellDate.getDate(),
        isCurrentMonth,
        isToday: isCurrentMonth && dateStr === today,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatDayPopoverHeader(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]!;
  const monthName = MONTH_FULL_NAMES[d.getMonth()]!;
  return `${dayName}, ${monthName} ${d.getDate()}`;
}
