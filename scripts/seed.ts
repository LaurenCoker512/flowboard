import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';
import * as schema from '../src/db/schema';

async function seed() {
  const { DATABASE_URL, SEED_USERNAME, SEED_PASSWORD, SEED_EMAIL } = process.env;

  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!SEED_USERNAME) throw new Error('SEED_USERNAME is required');
  if (!SEED_PASSWORD) throw new Error('SEED_PASSWORD is required');
  if (!SEED_EMAIL) throw new Error('SEED_EMAIL is required');

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  const passwordHash = await hash(SEED_PASSWORD, 12);

  const [user] = await db
    .insert(schema.users)
    .values({ username: SEED_USERNAME, email: SEED_EMAIL, passwordHash })
    .onConflictDoNothing()
    .returning();

  if (user) {
    await db
      .insert(schema.settings)
      .values({ userId: user.id })
      .onConflictDoNothing();
    console.log(`Seeded user: ${SEED_USERNAME}`);
  } else {
    console.log(`User ${SEED_USERNAME} already exists — skipping.`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
