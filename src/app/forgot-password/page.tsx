import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata = { title: 'Forgot password — Flowboard' };

export default function ForgotPasswordPage() {
  return (
    <div
      className="fb-grain"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 380,
          padding: '28px 28px 24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 10px 28px rgba(40, 30, 20, 0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 22,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="2" fill="var(--accent)" />
            <rect x="13" y="3" width="8" height="8" rx="2" fill="var(--accent-soft)" />
            <rect x="3" y="13" width="8" height="8" rx="2" fill="var(--accent-soft)" />
            <rect x="13" y="13" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.5" />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Flowboard
          </span>
        </div>

        <h1
          style={{
            margin: '0 0 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 19,
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          Reset your password
        </h1>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
