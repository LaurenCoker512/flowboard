export type CsvTaskRow = {
  id: string;
  title: string;
  projectId: string;
  priority: string;
  status: string;
  isArchived: boolean;
  date: string | null;
  startAt: string | null;
  endAt: string | null;
  isRecurring: boolean;
  completionCount: number;
  completedAt: string | null;
  description: string | null;
  backlogOrder: string | null;
  createdAt: string;
  updatedAt: string;
  subtaskTitles: string;
  subtaskCompletedCount: number;
};

const CSV_HEADERS = [
  'id',
  'title',
  'project_id',
  'priority',
  'status',
  'is_archived',
  'date',
  'start_at',
  'end_at',
  'is_recurring',
  'completion_count',
  'completed_at',
  'description',
  'backlog_order',
  'created_at',
  'updated_at',
  'subtask_titles',
  'subtask_completed_count',
];

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildTasksCSV(rows: CsvTaskRow[]): string {
  const dataRows = rows.map((t) =>
    [
      t.id,
      t.title,
      t.projectId,
      t.priority,
      t.status,
      t.isArchived,
      t.date ?? '',
      t.startAt ?? '',
      t.endAt ?? '',
      t.isRecurring,
      t.completionCount,
      t.completedAt ?? '',
      t.description ?? '',
      t.backlogOrder ?? '',
      t.createdAt,
      t.updatedAt,
      t.subtaskTitles,
      t.subtaskCompletedCount,
    ]
      .map(csvEscape)
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...dataRows].join('\n');
}

export function validateClearThreshold(days: unknown): number | null {
  const num = Number(days);
  if (!Number.isInteger(num) || num < 1 || num > 36500) return null;
  return num;
}

export function computeClearThreshold(olderThanDays: number): Date {
  return new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
}
