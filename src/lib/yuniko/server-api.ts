'use server';
import 'server-only';
import { cookies, headers } from 'next/headers';

export async function yunikoApi(path: string, init: RequestInit = {}) {
  const h = await headers();
  const cookieHeader = (await cookies()).toString();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocol = h.get('x-forwarded-proto') ?? 'https';
  const configured = (process.env.YUNIKO_API_URL ?? process.env.NEXT_PUBLIC_YUNIKO_API_URL ?? '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  const base = host ? protocol + '://' + host : (configured || 'https://yunikov1-app-api.lafatriniainaallane.workers.dev');
  const url = base + (path.startsWith('/') ? path : '/' + path);
  const headersOut = new Headers(init.headers);
  headersOut.set('accept', 'application/json');
  if (cookieHeader) headersOut.set('cookie', cookieHeader);
  if (init.body && !headersOut.has('content-type')) headersOut.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers: headersOut, cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload && typeof payload.error === 'string' ? payload.error : 'Yuniko API request failed (' + response.status + ')');
  return payload;
}
