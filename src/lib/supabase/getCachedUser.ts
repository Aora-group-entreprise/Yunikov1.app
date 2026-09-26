import 'server-only';

import { cache } from 'react';
import { createServerClient } from './server';
import { getYunikoServerUser } from '../yuniko/server-auth';

export const getRequestClient = cache(createServerClient);

export const getCachedUser = cache(async () => {
   const user = await getYunikoServerUser();
   if (!user?.authUserId) return null;
   return {
      id: user.authUserId,
      username: user.username,
      email: null,
      user_metadata: {
         username: user.username,
         full_name: user.displayName,
         avatar_url: user.avatarUrl,
      },
   };
});
