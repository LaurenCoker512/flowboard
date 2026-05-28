import type { SubtaskData } from '@/types';

export type Priority = 'must_do' | 'can_wait' | 'fun';
export type Status = 'backlog' | 'up_next' | 'in_progress' | 'done';

export type BoardTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: Priority;
  status: Status;
  isArchived: boolean;
  date: string | null;
  startAt: Date | null;
  endAt: Date | null;
  isRecurring: boolean;
  completedAt: Date | null;
  recurrenceRule: unknown;
  recurringMasterId: string | null;
  showSubtasksInline: boolean;
  subtasks: SubtaskData[];
  promoted?: boolean;
};

export type BoardFilters = {
  priorities: Priority[];
  projectIds: string[];
  recurringOnly: boolean;
};

export type BoardColumns = {
  appointments: BoardTask[];
  upNext: BoardTask[];
  inProgress: BoardTask[];
  done: BoardTask[];
  doneTotal: number;
};

export const DONE_CAP = 50;

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildBoardColumns(tasks: BoardTask[], today: string): BoardColumns {
  const appointments: BoardTask[] = [];
  const upNext: BoardTask[] = [];
  const inProgress: BoardTask[] = [];
  const allDone: BoardTask[] = [];

  for (const task of tasks) {
    if (task.isArchived) continue;

    const isToday = task.date === today;
    const isAppointment = isToday && task.startAt !== null;

    if (isAppointment) {
      appointments.push(task);
    } else if (task.status === 'up_next') {
      upNext.push(task);
    } else if (task.status === 'backlog' && isToday) {
      upNext.push({ ...task, promoted: true });
    } else if (task.status === 'in_progress') {
      inProgress.push(task);
    } else if (task.status === 'done') {
      allDone.push(task);
    }
  }

  appointments.sort((taskA, taskB) => {
    const timeA = taskA.startAt?.getTime() ?? 0;
    const timeB = taskB.startAt?.getTime() ?? 0;
    return timeA - timeB;
  });

  allDone.sort((taskA, taskB) => {
    const timeA = taskA.completedAt?.getTime() ?? 0;
    const timeB = taskB.completedAt?.getTime() ?? 0;
    return timeB - timeA;
  });

  return {
    appointments,
    upNext,
    inProgress,
    done: allDone.slice(0, DONE_CAP),
    doneTotal: allDone.length,
  };
}

export function applyFilters(tasks: BoardTask[], filters: BoardFilters): BoardTask[] {
  return tasks.filter((task) => {
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(task.projectId)) {
      return false;
    }
    if (filters.recurringOnly && !task.isRecurring) {
      return false;
    }
    return true;
  });
}

const DEFAULT_FILTERS: BoardFilters = {
  priorities: [],
  projectIds: [],
  recurringOnly: false,
};

function isValidPriority(value: unknown): value is Priority {
  return value === 'must_do' || value === 'can_wait' || value === 'fun';
}

export function parseFilters(raw: string | null): BoardFilters {
  if (raw === null) return { ...DEFAULT_FILTERS };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_FILTERS };
    }

    const obj = parsed as Record<string, unknown>;

    const priorities = Array.isArray(obj.priorities)
      ? (obj.priorities as unknown[]).filter(isValidPriority)
      : [];

    const projectIds = Array.isArray(obj.projectIds)
      ? (obj.projectIds as unknown[]).filter((item): item is string => typeof item === 'string')
      : [];

    const recurringOnly = typeof obj.recurringOnly === 'boolean' ? obj.recurringOnly : false;

    return { priorities, projectIds, recurringOnly };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function serializeFilters(filters: BoardFilters): string {
  return JSON.stringify(filters);
}

export function hasActiveFilters(filters: BoardFilters): boolean {
  return (
    filters.priorities.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.recurringOnly
  );
}
