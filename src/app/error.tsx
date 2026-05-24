'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
        padding: 32,
        textAlign: 'center',
      }}
    >
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
        Something went wrong
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
        An unexpected error occurred. Please try again.
      </p>
      <button className="fb-btn fb-btn--primary" onClick={unstable_retry}>
        Try again
      </button>
    </div>
  );
}
