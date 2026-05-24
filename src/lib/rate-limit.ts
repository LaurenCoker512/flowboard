import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:login',
});

export const resetRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:reset',
});

export function retryAfterSeconds(resetMs: number): number {
  return Math.max(0, Math.ceil((resetMs - Date.now()) / 1000));
}

export function retryAfterMessage(resetMs: number): string {
  const minutes = Math.ceil(retryAfterSeconds(resetMs) / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
}

export function getClientIp(headersList: Pick<Headers, 'get'>): string {
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '127.0.0.1';
  return headersList.get('x-real-ip') ?? '127.0.0.1';
}
