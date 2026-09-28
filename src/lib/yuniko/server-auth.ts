import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { getAuthenticatedUser } from './server-api';
import type { YunikoAuthUser } from './api';

export const getYunikoServerUser = cache(async (): Promise<YunikoAuthUser | null> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  const request = new Request('https://yunikov1.app/api/auth/me', {
    headers: { cookie: cookieHeader },
  });

  const user = await getAuthenticatedUser(request);
  if (!user) return null;

  return {
    id: String(user.id),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    country: user.country,
    countryFlag: user.countryFlag,
    age: user.age,
    bio: user.bio,
    website: user.website,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt,
  };
});
