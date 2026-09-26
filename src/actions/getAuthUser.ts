'use server';
import 'server-only';

import { cache } from 'react';
import { getYunikoServerUser } from '../lib/yuniko/server-auth';
import { getRequestClient } from '../lib/supabase/getCachedUser';

export const getAuthUser = cache(async () => {
   const yunikoUser = await getYunikoServerUser();
   if (!yunikoUser) throw new Error('Unauthorized');

   const supabase = await getRequestClient();
   return {
      supabase,
      user: {
         id: String(yunikoUser.id),
         username: yunikoUser.username,
         email: null,
         user_metadata: {
            username: yunikoUser.username,
            full_name: yunikoUser.displayName,
            avatar_url: yunikoUser.avatarUrl,
         },
      },
      yunikoUser,
   };
});

export const getOptionalUser = cache(async () => {
   const yunikoUser = await getYunikoServerUser();
   if (!yunikoUser) return { supabase: null, user: null, yunikoUser: null };
   return {
      supabase: await getRequestClient(),
      user: { id: String(yunikoUser.id), username: yunikoUser.username },
      yunikoUser,
   };
});
