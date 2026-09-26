import 'server-only';

import { cache } from 'react';
import { createServerClient } from './server';
import { getYunikoServerUser } from '../yuniko/server-auth';

export const getRequestClient = cache(createServerClient);

export const getCachedUser = cache(async () => {
   const user = await getYunikoServerUser();
   if (!user) return null;
   return {
      id: String(user.id),
      username: user.username,
      email: null,
      is_anonymous: false,
      user_metadata: {
         username: user.username,
         full_name: user.displayName,
         avatar_url: user.avatarUrl,
      },
   };
});
