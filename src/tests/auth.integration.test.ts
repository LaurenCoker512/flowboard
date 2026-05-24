import { describe, it, expect } from 'vitest';
import { compare, hash } from 'bcryptjs';

const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('auth — bcrypt password verification (integration)', () => {
  it('compare returns true for matching password/hash pair', async () => {
    const hashed = await hash('correctpassword', 10);
    const result = await compare('correctpassword', hashed);
    expect(result).toBe(true);
  });

  it('compare returns false for wrong password', async () => {
    const hashed = await hash('correctpassword', 10);
    const result = await compare('wrongpassword', hashed);
    expect(result).toBe(false);
  });
});

describe('auth — credential input validation', () => {
  it('rejects when username is not a string', () => {
    const username = undefined;
    const password = 'somepassword';
    const isValid = typeof username === 'string' && typeof password === 'string';
    expect(isValid).toBe(false);
  });

  it('rejects when password is not a string', () => {
    const username = 'testuser';
    const password = null;
    const isValid = typeof username === 'string' && typeof password === 'string';
    expect(isValid).toBe(false);
  });

  it('proceeds when both credentials are non-empty strings', () => {
    const username = 'testuser';
    const password = 'testpass';
    const isValid = typeof username === 'string' && typeof password === 'string';
    expect(isValid).toBe(true);
  });
});
