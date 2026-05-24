import { describe, it, expect, vi, afterEach } from 'vitest';
import { retryAfterSeconds, retryAfterMessage, getClientIp } from '@/lib/rate-limit';

afterEach(() => {
  vi.useRealTimers();
});

describe('retryAfterSeconds', () => {
  it('returns 0 for a past reset time', () => {
    expect(retryAfterSeconds(Date.now() - 1000)).toBe(0);
  });

  it('returns correct whole seconds for a future reset', () => {
    const reset = Date.now() + 90_000;
    expect(retryAfterSeconds(reset)).toBe(90);
  });

  it('rounds up fractional seconds', () => {
    const reset = Date.now() + 90_001;
    expect(retryAfterSeconds(reset)).toBe(91);
  });

  it('reflects elapsed time with fake clock', () => {
    vi.useFakeTimers();
    const reset = Date.now() + 15 * 60 * 1000;

    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(retryAfterSeconds(reset)).toBe(0);
  });
});

describe('retryAfterMessage', () => {
  it('uses singular "minute" for exactly 60 seconds remaining', () => {
    const reset = Date.now() + 60_000;
    expect(retryAfterMessage(reset)).toMatch(/1 minute[^s]/);
  });

  it('uses plural "minutes" for more than 60 seconds', () => {
    const reset = Date.now() + 120_000;
    expect(retryAfterMessage(reset)).toContain('2 minutes');
  });

  it('rounds partial minutes up', () => {
    const reset = Date.now() + 61_000;
    expect(retryAfterMessage(reset)).toContain('2 minutes');
  });

  it('starts with "Too many attempts"', () => {
    expect(retryAfterMessage(Date.now() + 60_000)).toMatch(/^Too many attempts/);
  });

  it('includes "Try again in"', () => {
    expect(retryAfterMessage(Date.now() + 60_000)).toContain('Try again in');
  });
});

describe('getClientIp', () => {
  function fakeHeaders(map: Record<string, string>): Pick<Headers, 'get'> {
    return { get: (key: string) => map[key.toLowerCase()] ?? null };
  }

  it('extracts the first IP from x-forwarded-for', () => {
    expect(getClientIp(fakeHeaders({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('handles a single IP in x-forwarded-for', () => {
    expect(getClientIp(fakeHeaders({ 'x-forwarded-for': '1.2.3.4' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(getClientIp(fakeHeaders({ 'x-real-ip': '9.10.11.12' }))).toBe('9.10.11.12');
  });

  it('returns 127.0.0.1 when no IP headers are present', () => {
    expect(getClientIp(fakeHeaders({}))).toBe('127.0.0.1');
  });
});
