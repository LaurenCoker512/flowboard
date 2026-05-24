import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata = { title: 'Reset password — Flowboard' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

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
          Set new password
        </h1>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div>
            <p
              role="alert"
              style={{
                padding: '8px 11px',
                borderRadius: 8,
                background: 'var(--p-must-tint)',
                border: '1px solid var(--p-must-soft)',
                fontSize: 12.5,
                color: 'var(--p-must)',
                lineHeight: 1.5,
              }}
            >
              This reset link is invalid. Please request a new one.
            </p>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <a
                href="/forgot-password"
                style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}
              >
                Request a new link
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
