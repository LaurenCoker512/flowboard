export type TaskFormValues = {
  title: string;
  projectId: string;
  priority: 'must_do' | 'can_wait' | 'fun';
  status: 'backlog' | 'up_next' | 'in_progress' | 'done';
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  isRecurring: boolean;
  recurrenceRuleJson: string;
};

export function resolveDefaultProject(
  lastUsedId: string | null,
  projects: Array<{ id: string }>,
  settingsDefaultId: string | null,
): string {
  if (projects.length === 0) return '';
  const ids = projects.map((p) => p.id);
  if (lastUsedId !== null && ids.includes(lastUsedId)) return lastUsedId;
  if (settingsDefaultId !== null && ids.includes(settingsDefaultId)) return settingsDefaultId;
  return ids[0] ?? '';
}

export function isTaskDirty(initial: TaskFormValues, current: TaskFormValues): boolean {
  return (Object.keys(initial) as Array<keyof TaskFormValues>).some(
    (key) => initial[key] !== current[key],
  );
}
