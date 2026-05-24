'use client';

import { useActionState } from 'react';
import { requestPasswordResetAction, type ResetRequestState } from '@/lib/reset-actions';

const initialState: ResetRequestState = { status: 'idle', message: null };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

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
        {state.resetUrl && (
          <a
            href={state.resetUrl}
            data-testid="test-reset-link"
            style={{ display: 'none' }}
            aria-hidden="true"
          >
            {state.resetUrl}
          </a>
        )}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/login" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: 12.5,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        Enter the email address for your account and we'll send you a reset link.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label className="fb-label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="fb-input"
          autoComplete="email"
          required
        />
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
        {isPending ? 'Sending…' : 'Send reset link'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <a href="/login" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>
          Back to sign in
        </a>
      </div>
    </form>
  );
}
