export function validateTaskTitle(title: unknown): string | null {
  if (typeof title !== 'string' || title.trim().length === 0) return 'Title is required.';
  if (title.trim().length > 255) return 'Title must be 255 characters or fewer.';
  return null;
}
