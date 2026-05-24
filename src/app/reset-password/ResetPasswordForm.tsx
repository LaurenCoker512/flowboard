'use client';

import { useActionState, useState } from 'react';
import { resetPasswordAction, type ResetPasswordState } from '@/lib/reset-actions';

const initialState: ResetPasswordState = { status: 'idle', message: null };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (state.status === 'success') {
    return (
      <div>
        <p
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--accent-tint)',
            border: '1px solid var(--accent-soft)',
            fontSize: 13,
            color: 'var(--accent-ink)',
            lineHeight: 1.5,
          }}
        >
          {state.message}
        </p>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/login" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      <div style={{ marginBottom: 12 }}>
        <label className="fb-label" htmlFor="password">
          New password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="fb-input"
            autoComplete="new-password"
            style={{ paddingRight: 36 }}
            minLength={8}
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              lineHeight: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {showPassword ? (
                <>
                  <path
                    d="M2 8C2 8 4.5 3 8 3s6 5 6 5-2.5 5-6 5-6-5-6-5z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.25" />
                  <line
                    x1="3"
                    y1="13"
                    x2="13"
                    y2="3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M2 8C2 8 4.5 3 8 3s6 5 6 5-2.5 5-6 5-6-5-6-5z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.25" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="fb-label" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            className="fb-input"
            autoComplete="new-password"
            style={{ paddingRight: 36 }}
            minLength={8}
            required
          />
          <button
            type="button"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            onClick={() => setShowConfirm((v) => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              lineHeight: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {showConfirm ? (
                <>
                  <path
                    d="M2 8C2 8 4.5 3 8 3s6 5 6 5-2.5 5-6 5-6-5-6-5z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.25" />
                  <line
                    x1="3"
                    y1="13"
                    x2="13"
                    y2="3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M2 8C2 8 4.5 3 8 3s6 5 6 5-2.5 5-6 5-6-5-6-5z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.25" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {state.status === 'error' && (
        <div
          role="alert"
          style={{
            padding: '8px 11px',
            borderRadius: 8,
            marginBottom: 12,
            background: 'var(--p-must-tint)',
            border: '1px solid var(--p-must-soft)',
            fontSize: 12.5,
            color: 'var(--p-must)',
          }}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="fb-btn fb-btn--primary"
        style={{ width: '100%', justifyContent: 'center', padding: '10px 12px' }}
      >
        {isPending ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}
