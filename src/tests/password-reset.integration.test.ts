import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { hashToken, generateResetToken } from '@/lib/password-reset';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/db/schema';

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('password reset — database integration', () => {
  let db: NodePgDatabase<typeof schema>;
  let users: (typeof schema)['users'];
  let passwordResetTokens: (typeof schema)['passwordResetTokens'];
  let testUserId: string;

  beforeAll(async () => {
    const dbModule = await import('@/db');
    const schemaModule = await import('@/db/schema');
    db = dbModule.db as NodePgDatabase<typeof schema>;
    users = schemaModule.users;
    passwordResetTokens = schemaModule.passwordResetTokens;

    const { hash } = await import('bcryptjs');
    const passwordHash = await hash('testpassword123', 10);

    const [user] = await db
      .insert(users)
      .values({
        username: `reset-test-${Date.now()}`,
        email: `reset-test-${Date.now()}@example.com`,
        passwordHash,
      })
      .returning({ id: users.id });

    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('writes a token record with correct hash', async () => {
    const { raw, hash: tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({ userId: testUserId, tokenHash, expiresAt });

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));

    expect(record).toBeDefined();
    expect(record.tokenHash).toBe(hashToken(raw));
    expect(record.usedAt).toBeNull();
    expect(record.expiresAt.getTime()).toBeCloseTo(expiresAt.getTime(), -2);
  });

  it('full reset flow: token written, redeemed, used_at set', async () => {
    const { raw, hash: tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({ userId: testUserId, tokenHash, expiresAt });

    const now = new Date();
    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(raw)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);

    expect(record).toBeDefined();

    await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, record.id));

    const [updated] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, record.id));

    expect(updated.usedAt).not.toBeNull();
  });

  it('second redemption is rejected (usedAt is set)', async () => {
    const { raw, hash: tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const usedAt = new Date();

    await db
      .insert(passwordResetTokens)
      .values({ userId: testUserId, tokenHash, expiresAt, usedAt });

    const results = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(raw)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      );

    expect(results).toHaveLength(0);
  });

  it('expired token is rejected', async () => {
    const { raw, hash: tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() - 1000);

    await db.insert(passwordResetTokens).values({ userId: testUserId, tokenHash, expiresAt });

    const results = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(raw)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      );

    expect(results).toHaveLength(0);
  });
});
