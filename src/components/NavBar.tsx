'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth-actions';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { id: 'board', label: 'Board', href: '/board' },
  { id: 'week', label: 'Week', href: '/week' },
  { id: 'month', label: 'Month', href: '/month' },
  { id: 'tasks', label: 'All tasks', href: '/tasks' },
  { id: 'projects', label: 'Projects', href: '/projects' },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <header
      className="fb-mobile-hidden"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 22px',
        height: 56,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        gap: 28,
        flexShrink: 0,
      }}
    >
      <Link
        href="/board"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          color: 'inherit',
        }}
        aria-label="Flowboard home"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2" fill="var(--accent)" />
          <rect x="13" y="3" width="8" height="8" rx="2" fill="var(--accent-soft)" />
          <rect x="3" y="13" width="8" height="8" rx="2" fill="var(--accent-soft)" />
          <rect x="13" y="13" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.5" />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          Flowboard
        </span>
      </Link>

      <nav style={{ display: 'flex', gap: 4, flex: 1 }} aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 600 : 450,
                color: isActive ? 'var(--accent-ink)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-tint)' : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <ThemeToggle />
        <Link
          href="/settings"
          className="fb-btn fb-btn--ghost"
          style={{ padding: 8 }}
          aria-label="Settings"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="fb-btn fb-btn--ghost"
            style={{ padding: '7px 10px', fontSize: 13 }}
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
