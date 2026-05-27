'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password'];

const TAB_LEFT: Array<{ id: string; label: string; href: string; icon: React.ReactNode }> = [
  {
    id: 'board',
    label: 'Board',
    href: '/board',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.8" />
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'week',
    label: 'Week',
    href: '/week',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const TAB_RIGHT: Array<{ id: string; label: string; href: string; icon: React.ReactNode }> = [
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    href: '/history',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function MobileTabBar() {
  const pathname = usePathname();

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav
      className="fb-tabbar fb-mobile-only"
      aria-label="Mobile navigation"
      role="navigation"
    >
      {TAB_LEFT.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`fb-tabbar-item${isActive(item.href) ? ' fb-tabbar-item--active' : ''}`}
          aria-current={isActive(item.href) ? 'page' : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}

      {/* Center FAB — navigates to /board?new=1 to open new task form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <Link
          href="/board?new=1"
          className="fb-tabbar-fab"
          aria-label="Create new task"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      {TAB_RIGHT.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`fb-tabbar-item${isActive(item.href) ? ' fb-tabbar-item--active' : ''}`}
          aria-current={isActive(item.href) ? 'page' : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
