import type { BacklogTaskRow } from './backlog-actions';

export type BacklogGroup = {
  projectId: string;
  projectName: string;
  projectColor: string;
  tasks: BacklogTaskRow[];
};

export function groupByProject(
  backlogTasks: BacklogTaskRow[],
  projects: Array<{ id: string; name: string; color: string }>,
): BacklogGroup[] {
  const grouped = new Map<string, BacklogGroup>();
  for (const task of backlogTasks) {
    let group = grouped.get(task.projectId);
    if (group === undefined) {
      group = {
        projectId: task.projectId,
        projectName: task.projectName,
        projectColor: task.projectColor,
        tasks: [],
      };
      grouped.set(task.projectId, group);
    }
    group.tasks.push(task);
  }

  const result: BacklogGroup[] = [];
  for (const project of projects) {
    const group = grouped.get(project.id);
    if (group !== undefined) {
      result.push(group);
    }
  }
  for (const group of grouped.values()) {
    if (!result.some((existingGroup) => existingGroup.projectId === group.projectId)) {
      result.push(group);
    }
  }
  return result;
}

export function parseBacklogOpen(raw: string | null): boolean {
  if (raw === null) return true;
  return raw === 'true';
}
