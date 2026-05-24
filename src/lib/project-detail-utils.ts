import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

export type ProjectDetailTask = {
  id: string;
  title: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  isRecurring: boolean;
  date: string | null;
  backlogOrder: string | null;
  completedAt: Date | null;
};

export type ProjectStats = {
  total: number;
  inProgress: number;
  backlog: number;
  doneThisMonth: number;
};

const REBALANCE_KEY_LENGTH_THRESHOLD = 15;

export function calculateStats(tasks: ProjectDetailTask[], today: string): ProjectStats {
  const parts = today.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  return {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    backlog: tasks.filter((t) => t.status === 'backlog').length,
    doneThisMonth: tasks.filter((t) => {
      if (t.status !== 'done' || t.completedAt === null) return false;
      return (
        t.completedAt.getFullYear() === year && t.completedAt.getMonth() + 1 === month
      );
    }).length,
  };
}

export function needsRebalance(key: string): boolean {
  return key.length > REBALANCE_KEY_LENGTH_THRESHOLD;
}

export function getBacklogOrderBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}

export function generateRebalancedOrders(count: number): string[] {
  if (count === 0) return [];
  return generateNKeysBetween(null, null, count);
}

export function sortBacklogTasks(tasks: ProjectDetailTask[]): ProjectDetailTask[] {
  return [...tasks].sort((a, b) => {
    if (a.backlogOrder !== null && b.backlogOrder !== null) {
      if (a.backlogOrder < b.backlogOrder) return -1;
      if (a.backlogOrder > b.backlogOrder) return 1;
      return 0;
    }
    if (a.backlogOrder !== null) return -1;
    if (b.backlogOrder !== null) return 1;
    return 0;
  });
}
