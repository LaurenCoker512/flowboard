import { createHash, randomBytes } from 'crypto';

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}

export function isTokenExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}

export function isTokenUsed(usedAt: Date | null): boolean {
  return usedAt !== null;
}

export function validateTokenRecord(record: {
  expiresAt: Date;
  usedAt: Date | null;
}): 'valid' | 'expired' | 'used' {
  if (isTokenUsed(record.usedAt)) return 'used';
  if (isTokenExpired(record.expiresAt)) return 'expired';
  return 'valid';
}

export function shouldCleanupToken(record: { expiresAt: Date; usedAt: Date | null }): boolean {
  return isTokenExpired(record.expiresAt) || isTokenUsed(record.usedAt);
}
