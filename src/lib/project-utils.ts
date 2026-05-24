import { PROJECT_PALETTE } from './design';

export type ProjectActionState = { error: string | null };

export type ProjectWithCount = {
  id: string;
  name: string;
  color: string;
  isArchived: boolean;
  createdAt: Date;
  taskCount: number;
};

export function validateProjectName(name: unknown): string | null {
  if (typeof name !== 'string' || name.trim().length === 0) return 'Name is required.';
  if (name.trim().length > 100) return 'Name must be 100 characters or fewer.';
  return null;
}

export function validateProjectColor(color: unknown): string | null {
  if (typeof color !== 'string' || !(PROJECT_PALETTE as readonly string[]).includes(color)) {
    return 'Please select a color.';
  }
  return null;
}
