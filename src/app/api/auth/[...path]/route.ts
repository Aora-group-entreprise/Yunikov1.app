import { NextResponse } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_YUNIKO_API_URL ?? 'https://yuniko-api.lafatriniainaallane.workers.dev').replace(/\/+$/, '');

const ALLOWED_AUTH_PATHS = new Set([
  'check-username',
  'login',
  'register',
  'logout',
  'me',
  'reset-password',
  'change-password',
  'delete-account',
]);

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxyAuth(request: Request, context: RouteContext) {
  const segments = (await context.params).path ?? [];
  const targetPath = segments.join('/');

  const allowed =
    ALLOWED_AUTH_PATHS.has(targetPath) ||
    (targetPath.startsWith('check-username/') && targetPath.split('/').length === 2);

  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const upstreamHeaders = new Headers();
  const cookie = request.headers.get('cookie');
  const contentType = request.headers.get('content-type');
  if (cookie) upstreamHeaders.set('cookie', cookie);
  if (contentType) upstreamHeaders.set('content-type', contentType);

  const init: RequestInit = {
    method: request.method,
    headers: upstreamHeaders,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(API_URL + '/api/auth/' + targetPath, init);
  } catch {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 502 });
  }

  const responseHeaders = new Headers();
  const responseContentType = upstream.headers.get('content-type');
  if (responseContentType) responseHeaders.set('content-type', responseContentType);

  const setCookies =
    typeof (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (upstream.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [];

  if (setCookies.length > 0) {
    for (const value of setCookies) responseHeaders.append('set-cookie', value);
  } else {
    const setCookie = upstream.headers.get('set-cookie');
    if (setCookie) responseHeaders.append('set-cookie', setCookie);
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxyAuth;
export const POST = proxyAuth;
export const PATCH = proxyAuth;
