import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Authentication is owned by the Yuniko API. The browser talks to that API
// directly with credentials: 'include', so this Next.js middleware must not
// try to read or validate the API's host-only session cookie.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_vercel|mux-webhook|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
