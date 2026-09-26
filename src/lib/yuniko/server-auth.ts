import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { normalizeYunikoAuthUser, yunikoApiFetch, type YunikoAuthUser } from './api';

export const getYunikoServerUser = cache(async (): Promise<YunikoAuthUser | null> => {
  const cookieHeader = (await cookies()).toString();
  const response = await yunikoApiFetch('/auth/me', {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!response.ok) return null;
  return normalizeYunikoAuthUser(await response.json());
});
