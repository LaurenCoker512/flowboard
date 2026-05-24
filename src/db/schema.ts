import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const priorityEnum = pgEnum('priority', ['must_do', 'can_wait', 'fun']);
export const statusEnum = pgEnum('status', ['backlog', 'up_next', 'in_progress', 'done']);
export const weekStartDayEnum = pgEnum('week_start_day', ['sunday', 'monday']);
export const defaultViewEnum = pgEnum('default_view', ['board', 'week', 'month']);
export const densityEnum = pgEnum('density', ['compact', 'default', 'roomy']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_prt_token_hash').on(table.tokenHash),
    index('idx_prt_user_id').on(table.userId),
  ],
);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    title: varchar('title', { length: 255 }).notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    priority: priorityEnum('priority').notNull(),
    status: statusEnum('status').notNull(),
    isArchived: boolean('is_archived').notNull().default(false),
    date: date('date'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurrenceRule: jsonb('recurrence_rule'),
    completionCount: integer('completion_count').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    recurringMasterId: uuid('recurring_master_id').references(
      (): AnyPgColumn => tasks.id,
      { onDelete: 'cascade' },
    ),
    recurringOccurrenceDate: date('recurring_occurrence_date'),
    backlogOrder: varchar('backlog_order', { length: 255 }),
    description: text('description'),
    showSubtasksInline: boolean('show_subtasks_inline').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tasks_project_id').on(table.projectId),
    index('idx_tasks_status').on(table.status),
    index('idx_tasks_date').on(table.date),
    index('idx_tasks_recurring_master_id').on(table.recurringMasterId),
  ],
);


export const subtasks = pgTable(
  'subtasks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    sortOrder: real('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_subtasks_task_id').on(table.taskId)],
);

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  weekStartDay: weekStartDayEnum('week_start_day').notNull().default('sunday'),
  defaultView: defaultViewEnum('default_view').notNull().default('board'),
  defaultProjectId: uuid('default_project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  density: densityEnum('density').notNull().default('default'),
  quietEvenings: boolean('quiet_evenings').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
