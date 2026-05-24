import { describe, it, expect } from 'vitest';
import {
  hashToken,
  generateResetToken,
  isTokenExpired,
  isTokenUsed,
  validateTokenRecord,
  shouldCleanupToken,
} from '@/lib/password-reset';

describe('hashToken', () => {
  it('produces a 64-character hex string', () => {
    expect(hashToken('some-token')).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hashToken('some-token'))).toBe(true);
  });

  it('is deterministic for the same input', () => {
    expect(hashToken('same-input')).toBe(hashToken('same-input'));
  });

  it('produces different output for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('SHA-256 of empty string matches known value', () => {
    expect(hashToken('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('generateResetToken', () => {
  it('produces a 64-character hex raw token', () => {
    const { raw } = generateResetToken();
    expect(raw).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(raw)).toBe(true);
  });

  it('hash matches hashToken(raw)', () => {
    const { raw, hash } = generateResetToken();
    expect(hash).toBe(hashToken(raw));
  });

  it('generates unique tokens each call', () => {
    expect(generateResetToken().raw).not.toBe(generateResetToken().raw);
  });
});

describe('isTokenExpired', () => {
  it('returns true for a past date', () => {
    expect(isTokenExpired(new Date(Date.now() - 1000))).toBe(true);
  });

  it('returns false for a future date', () => {
    expect(isTokenExpired(new Date(Date.now() + 60_000))).toBe(false);
  });
});

describe('isTokenUsed', () => {
  it('returns true when usedAt is a date', () => {
    expect(isTokenUsed(new Date())).toBe(true);
  });

  it('returns false when usedAt is null', () => {
    expect(isTokenUsed(null)).toBe(false);
  });
});

describe('validateTokenRecord', () => {
  const futureDate = new Date(Date.now() + 60_000);
  const pastDate = new Date(Date.now() - 1000);

  it('returns valid for unexpired, unused token', () => {
    expect(validateTokenRecord({ expiresAt: futureDate, usedAt: null })).toBe('valid');
  });

  it('returns expired for past expiry', () => {
    expect(validateTokenRecord({ expiresAt: pastDate, usedAt: null })).toBe('expired');
  });

  it('returns used when usedAt is set', () => {
    expect(validateTokenRecord({ expiresAt: futureDate, usedAt: new Date() })).toBe('used');
  });

  it('returns used over expired when both apply', () => {
    expect(validateTokenRecord({ expiresAt: pastDate, usedAt: new Date() })).toBe('used');
  });
});

describe('shouldCleanupToken', () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 1000);

  it('returns true for an expired, unused token', () => {
    expect(shouldCleanupToken({ expiresAt: past, usedAt: null })).toBe(true);
  });

  it('returns true for an unexpired but used token', () => {
    expect(shouldCleanupToken({ expiresAt: future, usedAt: new Date() })).toBe(true);
  });

  it('returns true when both expired and used', () => {
    expect(shouldCleanupToken({ expiresAt: past, usedAt: new Date() })).toBe(true);
  });

  it('returns false for a valid token (not expired, not used)', () => {
    expect(shouldCleanupToken({ expiresAt: future, usedAt: null })).toBe(false);
  });
});
