import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_YUNIKO_API_URL ?? 'https://yuniko-api.lafatriniainaallane.workers.dev').replace(/\/+$/, '');

const PUBLIC_PREFIXES = [
   '/login',
   '/emailsignup',
   '/auth/',
   '/api/auth/',
   '/mux-webhook',
];

export async function middleware(request: NextRequest) {
   const pathname = request.nextUrl.pathname;

   if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      return NextResponse.next();
   }

   const session = request.cookies.get('yuniko_session')?.value;
   if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      return NextResponse.redirect(url);
   }

   try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
         headers: { cookie: `yuniko_session=${encodeURIComponent(session)}` },
         cache: 'no-store',
      });

      if (response.ok) return NextResponse.next();

      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      return NextResponse.redirect(url);
   } catch {
      // Keep navigation possible during a temporary API outage.
      return NextResponse.next();
   }
}

export const config = {
   matcher: [
      '/((?!_next/static|_next/image|_vercel|mux-webhook|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
   ],
};
