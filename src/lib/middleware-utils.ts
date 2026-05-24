const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function getRedirectTarget(
  pathname: string,
  isAuthenticated: boolean,
): string | null {
  if (!isAuthenticated && !isPublicPath(pathname)) return '/login';
  if (isAuthenticated && pathname === '/login') return '/board';
  return null;
}
