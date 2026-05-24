import type { BoardFilters, Priority, Status } from '@/lib/board-utils';

export type GroupBy = 'project' | 'status' | 'date';

export type AllTask = {
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
  recurrenceRule: unknown;
  completedAt: Date | null;
};

export type TaskGroup = {
  key: string;
  label: string;
  tasks: AllTask[];
};

const STATUS_ORDER: Status[] = ['backlog', 'up_next', 'in_progress', 'done'];

const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Later',
  up_next: "What's next",
  in_progress: 'In progress',
  done: 'Done',
};

export function applyAllTasksFilters(
  tasks: AllTask[],
  filters: BoardFilters,
  searchQuery: string,
  showArchived: boolean,
): AllTask[] {
  const query = searchQuery.trim().toLowerCase();
  return tasks.filter((task) => {
    if (!showArchived && task.isArchived) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(task.projectId)) return false;
    if (filters.recurringOnly && !task.isRecurring) return false;
    if (query.length > 0 && !task.title.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function groupTasks(tasks: AllTask[], groupBy: GroupBy): TaskGroup[] {
  if (groupBy === 'project') return groupByProject(tasks);
  if (groupBy === 'status') return groupByStatus(tasks);
  return groupByDate(tasks);
}

function groupByProject(tasks: AllTask[]): TaskGroup[] {
  const map = new Map<string, { label: string; tasks: AllTask[] }>();
  for (const task of tasks) {
    const existing = map.get(task.projectId);
    if (existing !== undefined) {
      existing.tasks.push(task);
    } else {
      map.set(task.projectId, { label: task.projectName, tasks: [task] });
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => a.label.localeCompare(b.label))
    .map(([key, { label, tasks: groupedTasks }]) => ({ key, label, tasks: groupedTasks }));
}

function groupByStatus(tasks: AllTask[]): TaskGroup[] {
  const buckets = new Map<Status, AllTask[]>();
  for (const status of STATUS_ORDER) {
    buckets.set(status, []);
  }
  const archived: AllTask[] = [];

  for (const task of tasks) {
    if (task.isArchived) {
      archived.push(task);
    } else {
      buckets.get(task.status)?.push(task);
    }
  }

  const groups: TaskGroup[] = [];
  for (const status of STATUS_ORDER) {
    const groupedTasks = buckets.get(status) ?? [];
    if (groupedTasks.length > 0) {
      groups.push({ key: status, label: STATUS_LABELS[status], tasks: groupedTasks });
    }
  }
  if (archived.length > 0) {
    groups.push({ key: 'archived', label: 'Archived', tasks: archived });
  }
  return groups;
}

function groupByDate(tasks: AllTask[]): TaskGroup[] {
  const map = new Map<string, AllTask[]>();
  const noDates: AllTask[] = [];
  for (const task of tasks) {
    if (task.date === null) {
      noDates.push(task);
    } else {
      const existing = map.get(task.date);
      if (existing !== undefined) {
        existing.push(task);
      } else {
        map.set(task.date, [task]);
      }
    }
  }
  const groups: TaskGroup[] = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, dateTasks]) => ({
      key: dateStr,
      label: formatDateGroupLabel(dateStr),
      tasks: dateTasks,
    }));
  if (noDates.length > 0) {
    groups.push({ key: 'no-date', label: 'No date', tasks: noDates });
  }
  return groups;
}

function formatDateGroupLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTaskDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}
