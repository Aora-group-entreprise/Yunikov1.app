import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';

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
  const upstreamPath = path === '/health' ? '/healthz' : path;

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
    const { env } = await getCloudflareContext({ async: true });
    const apiBaseUrl = String(
      (env as { YUNIKO_API_URL?: string }).YUNIKO_API_URL ??
        'https://yunikov1-app-api.lafatriniainaallane.workers.dev',
    )
      .replace(/\/+$/, '')
      .replace(/\/api$/, '');
    const target = new URL(apiBaseUrl + '/api' + upstreamPath);
    target.search = incomingUrl.search;
    const api = (env as {
      YUNIKO_API?: {
        fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
      };
    }).YUNIKO_API;

    let upstream: Response;
    if (api) {
      try {
        upstream = await api.fetch(new Request(target, init));
      } catch (bindingError) {
        console.error('Yuniko API service binding error, using public API fallback', bindingError);
        upstream = await fetch(target, init);
      }
    } else {
      upstream = await fetch(target, init);
    }
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
