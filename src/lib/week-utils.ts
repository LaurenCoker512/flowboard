const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export type WeekDay = {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
};

export type WeekTask = {
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

export type OverlapGroup = {
  events: WeekTask[];
};

export function getWeekStart(anchor: Date, weekStart: 'sunday' | 'monday'): Date {
  const dow = anchor.getDay();
  const offset = weekStart === 'sunday' ? dow : (dow === 0 ? 6 : dow - 1);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekDays(
  anchor: Date,
  weekStart: 'sunday' | 'monday',
  today: string,
): WeekDay[] {
  const start = getWeekStart(anchor, weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: d,
      dateStr,
      dayName: DAY_NAMES[d.getDay()]!,
      dayNum: d.getDate(),
      isToday: dateStr === today,
    };
  });
}

export function formatWeekHeader(days: WeekDay[]): string {
  const first = days[0]!.date;
  const last = days[6]!.date;
  const firstMonth = MONTH_NAMES[first.getMonth()]!;
  const lastMonth = MONTH_NAMES[last.getMonth()]!;
  const year = last.getFullYear();
  if (first.getMonth() === last.getMonth()) {
    return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${year}`;
  }
  return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${year}`;
}

export function nearestThirtyMin(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const remainder = minutes % 30;
  if (remainder === 0) return result;
  result.setMinutes(minutes + (30 - remainder), 0, 0);
  return result;
}

export function shiftDatePreservingTime(
  startAt: Date,
  endAt: Date | null,
  newDate: string,
): { startAt: Date; endAt: Date | null } {
  const [yearStr, monthStr, dayStr] = newDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);

  const newStartAt = new Date(startAt);
  newStartAt.setFullYear(year, month, day);

  let newEndAt: Date | null = null;
  if (endAt !== null) {
    const duration = endAt.getTime() - startAt.getTime();
    newEndAt = new Date(newStartAt.getTime() + duration);
  }
  return { startAt: newStartAt, endAt: newEndAt };
}

function getEventEndMs(event: WeekTask): number {
  const start = event.startAt?.getTime() ?? 0;
  return event.endAt?.getTime() ?? start + 3600000;
}

export function computeOverlapGroups(events: WeekTask[]): OverlapGroup[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    const ta = a.startAt?.getTime() ?? 0;
    const tb = b.startAt?.getTime() ?? 0;
    return ta - tb;
  });

  const groups: OverlapGroup[] = [];
  let currentGroup: WeekTask[] = [sorted[0]!];
  let groupMaxEnd = getEventEndMs(sorted[0]!);

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i]!;
    const startMs = event.startAt?.getTime() ?? 0;
    if (startMs < groupMaxEnd) {
      currentGroup.push(event);
      groupMaxEnd = Math.max(groupMaxEnd, getEventEndMs(event));
    } else {
      groups.push({ events: currentGroup });
      currentGroup = [event];
      groupMaxEnd = getEventEndMs(event);
    }
  }
  groups.push({ events: currentGroup });
  return groups;
}

export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${displayHour}${displayMinutes}${period}`;
}

export function dateToTimeInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
