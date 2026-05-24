'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: '#F0EEEA',
          color: '#34302C',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 16,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Something went wrong</p>
        <p style={{ fontSize: 14, color: '#7C7770', margin: 0 }}>
          A critical error occurred. Please reload the page.
        </p>
        <button
          onClick={unstable_retry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            font: '500 13px/1 ui-sans-serif, system-ui, sans-serif',
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: '#C99098',
            color: '#FFF8F4',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
