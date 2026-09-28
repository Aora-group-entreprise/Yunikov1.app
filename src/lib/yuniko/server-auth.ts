import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import type { YunikoAuthUser } from './api';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_YUNIKO_API_URL ??
  'https://yuniko-api.lafatriniainaallane.workers.dev'
).replace(/\/+(?:api\/?)?$/, '');

export const getYunikoServerUser = cache(async (): Promise<YunikoAuthUser | null> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  try {
    const response = await fetch(API_BASE_URL + '/api/auth/me', {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const user = data as YunikoAuthUser & { id: string | number };

    return {
      ...user,
      id: String(user.id),
    };
  } catch (error) {
    console.error('Yuniko API auth lookup failed', error);
    return null;
  }
});
