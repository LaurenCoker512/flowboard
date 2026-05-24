'use client';

import { useActionState, useState } from 'react';
import { loginAction } from '@/lib/auth-actions';

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction}>
      <div style={{ marginBottom: 12 }}>
        <label className="fb-label" htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          className="fb-input"
          autoComplete="username"
          required
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="fb-label" htmlFor="password">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="fb-input"
            autoComplete="current-password"
            style={{ paddingRight: 36 }}
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--text-tertiary)', lineHeight: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {showPassword ? (
                <>
                  <path d="M2 8C2 8 4.5 3 8 3s6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.25"/>
                  <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
                  <line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                </>
              ) : (
                <>
                  <path d="M2 8C2 8 4.5 3 8 3s6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.25"/>
                  <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 11px', borderRadius: 8, marginBottom: 12,
            background: 'var(--p-must-tint)', border: '1px solid var(--p-must-soft)',
            fontSize: 12.5, color: 'var(--p-must)',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="fb-btn fb-btn--primary"
        style={{ width: '100%', justifyContent: 'center', padding: '10px 12px' }}
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <a
          href="/forgot-password"
          style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}
        >
          Forgot password?
        </a>
      </div>
    </form>
  );
}
