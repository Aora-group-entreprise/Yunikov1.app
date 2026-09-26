'use server';
import 'server-only';

import { cache } from 'react';
import { getYunikoServerUser } from '../lib/yuniko/server-auth';
import { getRequestClient } from '../lib/supabase/getCachedUser';

export const getAuthUser = cache(async () => {
   const yunikoUser = await getYunikoServerUser();
   if (!yunikoUser) throw new Error('Unauthorized');

   const authUserId = yunikoUser.authUserId;
   if (!authUserId) {
      throw new Error('Yuniko account is not linked to a Supabase profile');
   }

   const supabase = await getRequestClient();
   return {
      supabase,
      user: {
         id: authUserId,
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
   if (!yunikoUser?.authUserId) return { supabase: await getRequestClient(), user: null, yunikoUser: null };
   return {
      supabase: await getRequestClient(),
      user: { id: yunikoUser.authUserId, username: yunikoUser.username },
      yunikoUser,
   };
});
