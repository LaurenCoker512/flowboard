import { db } from '../src/db';
import { tasks, projects, taskCompletions } from '../src/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function run() {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      date: tasks.date,
      startAt: tasks.startAt,
      endAt: tasks.endAt,
      isRecurring: tasks.isRecurring,
      completedAt: tasks.completedAt,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.isArchived, true),
        eq(tasks.status, 'done'),
        isNotNull(tasks.completedAt),
      ),
    );

  if (rows.length === 0) {
    console.log('No archived tasks to backfill.');
    process.exit(0);
  }

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db.insert(taskCompletions).values(
      batch.map((row) => ({
        taskId: row.id,
        title: row.title,
        projectId: row.projectId,
        projectName: row.projectName,
        projectColor: row.projectColor,
        completedAt: row.completedAt!,
        date: row.date,
        startAt: row.startAt,
        endAt: row.endAt,
        isRecurring: row.isRecurring,
      })),
    );
    console.log(`Inserted batch ${Math.floor(i / BATCH) + 1} (${batch.length} rows)`);
  }

  console.log(`Done. Backfilled ${rows.length} completions.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
