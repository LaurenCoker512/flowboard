import { describe, it, expect } from 'vitest';
import { getRedirectTarget } from '@/lib/middleware-utils';

describe('middleware — getRedirectTarget', () => {
  describe('unauthenticated user', () => {
    it('redirects / to /login', () => {
      expect(getRedirectTarget('/', false)).toBe('/login');
    });

    it('redirects /board to /login', () => {
      expect(getRedirectTarget('/board', false)).toBe('/login');
    });

    it('redirects /settings to /login', () => {
      expect(getRedirectTarget('/settings', false)).toBe('/login');
    });

    it('allows /login through', () => {
      expect(getRedirectTarget('/login', false)).toBeNull();
    });

    it('allows /reset-password through', () => {
      expect(getRedirectTarget('/reset-password', false)).toBeNull();
    });

    it('allows /reset-password with query-like path suffix through', () => {
      expect(getRedirectTarget('/reset-password/confirm', false)).toBeNull();
    });
  });

  describe('authenticated user', () => {
    it('allows /board through', () => {
      expect(getRedirectTarget('/board', true)).toBeNull();
    });

    it('allows /settings through', () => {
      expect(getRedirectTarget('/settings', true)).toBeNull();
    });

    it('redirects /login to /board', () => {
      expect(getRedirectTarget('/login', true)).toBe('/board');
    });

    it('allows /reset-password through even when authenticated', () => {
      expect(getRedirectTarget('/reset-password', true)).toBeNull();
    });
  });
});
