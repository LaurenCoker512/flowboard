import { describe, it, expect, vi, afterEach } from 'vitest';
import { retryAfterSeconds, retryAfterMessage } from '@/lib/rate-limit';

afterEach(() => {
  vi.useRealTimers();
});

/**
 * In-memory rate limiter that matches the { success, reset } shape returned
 * by @upstash/ratelimit — used to simulate window-based limiting without Redis.
 */
class SimulatedRatelimit {
  private counters = new Map<string, number>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  async limit(key: string): Promise<{ success: boolean; reset: number }> {
    const count = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, count);
    return { success: count <= this.max, reset: Date.now() + this.windowMs };
  }

  clear(): void {
    this.counters.clear();
  }
}

describe('login rate limit — 10 attempts per 15-min window', () => {
  const LOGIN_MAX = 10;
  const WINDOW_MS = 15 * 60 * 1000;

  it('allows up to 10 attempts from the same IP', async () => {
    const limiter = new SimulatedRatelimit(LOGIN_MAX, WINDOW_MS);
    for (let i = 0; i < LOGIN_MAX; i++) {
      const { success } = await limiter.limit('1.2.3.4');
      expect(success).toBe(true);
    }
  });

  it('blocks the 11th attempt and returns a future reset timestamp', async () => {
    const limiter = new SimulatedRatelimit(LOGIN_MAX, WINDOW_MS);
    for (let i = 0; i < LOGIN_MAX; i++) {
      await limiter.limit('1.2.3.4');
    }
    const { success, reset } = await limiter.limit('1.2.3.4');
    expect(success).toBe(false);
    expect(reset).toBeGreaterThan(Date.now());
    expect(retryAfterSeconds(reset)).toBeGreaterThan(0);
    expect(retryAfterSeconds(reset)).toBeLessThanOrEqual(Math.ceil(WINDOW_MS / 1000));
  });

  it('Retry-After message on the 11th attempt names the remaining minutes', async () => {
    const limiter = new SimulatedRatelimit(LOGIN_MAX, WINDOW_MS);
    for (let i = 0; i < LOGIN_MAX; i++) {
      await limiter.limit('1.2.3.4');
    }
    const { success, reset } = await limiter.limit('1.2.3.4');
    expect(success).toBe(false);
    const message = retryAfterMessage(reset);
    expect(message).toMatch(/^Too many attempts\. Try again in \d+ minutes?\./);
  });

  it('does not affect a different IP', async () => {
    const limiter = new SimulatedRatelimit(LOGIN_MAX, WINDOW_MS);
    for (let i = 0; i < LOGIN_MAX + 1; i++) {
      await limiter.limit('1.2.3.4');
    }
    const { success } = await limiter.limit('5.6.7.8');
    expect(success).toBe(true);
  });

  it('retryAfterSeconds returns 0 once the window has elapsed (mock clock)', () => {
    vi.useFakeTimers();
    const reset = Date.now() + WINDOW_MS;
    expect(retryAfterSeconds(reset)).toBeGreaterThan(0);

    vi.advanceTimersByTime(WINDOW_MS);
    expect(retryAfterSeconds(reset)).toBe(0);
  });
});

describe('password-reset rate limit — 5 requests per 1-hour window', () => {
  const RESET_MAX = 5;
  const WINDOW_MS = 60 * 60 * 1000;

  it('allows up to 5 requests from the same IP', async () => {
    const limiter = new SimulatedRatelimit(RESET_MAX, WINDOW_MS);
    for (let i = 0; i < RESET_MAX; i++) {
      const { success } = await limiter.limit('1.2.3.4');
      expect(success).toBe(true);
    }
  });

  it('blocks the 6th request and reports correct Retry-After', async () => {
    const limiter = new SimulatedRatelimit(RESET_MAX, WINDOW_MS);
    for (let i = 0; i < RESET_MAX; i++) {
      await limiter.limit('1.2.3.4');
    }
    const { success, reset } = await limiter.limit('1.2.3.4');
    expect(success).toBe(false);
    expect(retryAfterMessage(reset)).toContain('Try again in');
  });

  it('retryAfterSeconds returns 0 once the hour window has elapsed (mock clock)', () => {
    vi.useFakeTimers();
    const reset = Date.now() + WINDOW_MS;
    expect(retryAfterSeconds(reset)).toBeGreaterThan(0);

    vi.advanceTimersByTime(WINDOW_MS);
    expect(retryAfterSeconds(reset)).toBe(0);
  });
});
