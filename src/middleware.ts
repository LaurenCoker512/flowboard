import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getRedirectTarget } from '@/lib/middleware-utils';

export default auth((req) => {
  const target = getRedirectTarget(req.nextUrl.pathname, !!req.auth);
  if (target) {
    return NextResponse.redirect(new URL(target, req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
