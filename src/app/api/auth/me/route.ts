import { NextResponse } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_YUNIKO_API_URL ?? 'https://yuniko-api.lafatriniainaallane.workers.dev').replace(/\/+$/, '');

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: cookie ? { cookie } : undefined,
    cache: 'no-store',
  });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  });
}
