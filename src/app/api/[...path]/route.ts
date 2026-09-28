import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_YUNIKO_API_URL ??
  'https://yuniko-api.lafatriniainaallane.workers.dev'
).replace(/\/+(?:api\/?)?$/, '');

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'content-length') return;
    headers.set(key, value);
  });
  return headers;
}

async function proxy(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const path = incomingUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  const target = new URL(API_BASE_URL + '/api' + path);
  target.search = incomingUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    redirect: 'manual',
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers();

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      responseHeaders.set(key, value);
    });

    const headersWithCookies = upstream.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const cookies = headersWithCookies.getSetCookie?.() ?? [];
    for (const cookie of cookies) responseHeaders.append('set-cookie', cookie);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Yuniko API proxy error', error);
    return NextResponse.json(
      { error: 'Yuniko API unavailable' },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
