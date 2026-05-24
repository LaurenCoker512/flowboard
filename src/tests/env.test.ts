import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('env validation', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/flowboard',
    NEXTAUTH_SECRET: 'a'.repeat(32),
    NEXTAUTH_URL: 'http://localhost:3000',
    RESEND_API_KEY: 're_test_key',
    UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'token123',
    SEED_USERNAME: 'admin',
    SEED_PASSWORD: 'password123456',
    SEED_EMAIL: 'user@example.com',
  };

  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, validEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(validEnv)) {
      delete process.env[key];
    }
  });

  it('passes with all required vars present', async () => {
    await expect(import('@/lib/env')).resolves.not.toThrow();
  });

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('@/lib/env')).rejects.toThrow('DATABASE_URL');
  });

  it('throws when NEXTAUTH_SECRET is too short', async () => {
    process.env.NEXTAUTH_SECRET = 'tooshort';
    await expect(import('@/lib/env')).rejects.toThrow('NEXTAUTH_SECRET');
  });

  it('throws when SEED_EMAIL is not a valid email', async () => {
    process.env.SEED_EMAIL = 'not-an-email';
    await expect(import('@/lib/env')).rejects.toThrow('SEED_EMAIL');
  });
});
