import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  users,
  passwordResetTokens,
  projects,
  tasks,
  settings,
} from '@/db/schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;
export type NewPasswordResetToken = InferInsertModel<typeof passwordResetTokens>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

export type Settings = InferSelectModel<typeof settings>;
export type NewSettings = InferInsertModel<typeof settings>;

export type Priority = Task['priority'];
export type Status = Task['status'];
export type Density = Settings['density'];
export type WeekStartDay = Settings['weekStartDay'];
export type DefaultView = Settings['defaultView'];
