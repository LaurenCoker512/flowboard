import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import path from 'path';
import * as schema from '@/db/schema';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

const describeIfDb = TEST_DB_URL ? describe : describe.skip;

describeIfDb('database integration — migrations and FK cascades', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('all tables exist after migration', async () => {
    const result = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const tables = result.rows.map((r) => r.tablename);
    expect(tables).toContain('users');
    expect(tables).toContain('projects');
    expect(tables).toContain('tasks');
    expect(tables).toContain('settings');
    expect(tables).toContain('password_reset_tokens');
  });

  it('tasks table has all required columns', async () => {
    const result = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'`,
    );
    const cols = result.rows.map((r) => r.column_name);
    const required = [
      'id', 'title', 'project_id', 'priority', 'status', 'is_archived',
      'date', 'start_at', 'end_at', 'is_recurring', 'recurrence_rule',
      'completion_count', 'completed_at', 'recurring_master_id',
      'recurring_occurrence_date', 'backlog_order', 'description',
      'created_at', 'updated_at',
    ];
    for (const col of required) {
      expect(cols).toContain(col);
    }
  });

  it('deleting a project cascades to delete its tasks', async () => {
    const [project] = await db
      .insert(schema.projects)
      .values({ name: 'Cascade Test', color: '#D49B92' })
      .returning();

    await db.insert(schema.tasks).values([
      { title: 'Task A', projectId: project.id, priority: 'must_do', status: 'backlog' },
      { title: 'Task B', projectId: project.id, priority: 'can_wait', status: 'up_next' },
    ]);

    const beforeDelete = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, project.id));
    expect(beforeDelete).toHaveLength(2);

    await db.delete(schema.projects).where(eq(schema.projects.id, project.id));

    const afterDelete = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, project.id));
    expect(afterDelete).toHaveLength(0);
  });

  it('deleting a master recurring task cascades to delete its exception records', async () => {
    const [project] = await db
      .insert(schema.projects)
      .values({ name: 'Recur Test', color: '#88B5A4' })
      .returning();

    const [master] = await db
      .insert(schema.tasks)
      .values({
        title: 'Master task',
        projectId: project.id,
        priority: 'fun',
        status: 'backlog',
        isRecurring: true,
        recurrenceRule: { frequency: 'daily', interval: 1, ends: null },
        date: '2026-06-01',
      })
      .returning();

    await db.insert(schema.tasks).values({
      title: 'Exception record',
      projectId: project.id,
      priority: 'fun',
      status: 'backlog',
      recurringMasterId: master.id,
      recurringOccurrenceDate: '2026-06-03',
      date: '2026-06-03',
    });

    await db.delete(schema.tasks).where(eq(schema.tasks.id, master.id));

    const exceptions = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.recurringMasterId, master.id));
    expect(exceptions).toHaveLength(0);

    // cleanup
    await db.delete(schema.projects).where(eq(schema.projects.id, project.id));
  });
});
