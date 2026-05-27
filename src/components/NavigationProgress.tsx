'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'filling' | 'completing';

export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const prevPathname = useRef(pathname);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]');
      if (anchor === null) return;
      const href = anchor.getAttribute('href');
      if (href === null || href.startsWith('#') || href.startsWith('mailto:')) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname !== prevPathname.current) {
          if (hideTimer.current !== null) clearTimeout(hideTimer.current);
          setPhase('filling');
        }
      } catch {
        // ignore unparseable hrefs
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    setPhase('completing');
    hideTimer.current = setTimeout(() => setPhase('idle'), 450);
    return () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  if (phase === 'idle') return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'var(--accent)',
        transformOrigin: 'left',
        animation: phase === 'filling'
          ? 'nav-fill 2s ease-out forwards'
          : 'nav-complete 450ms ease forwards',
      }}
    />
  );
}
