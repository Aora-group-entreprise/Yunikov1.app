import 'server-only';

import { cache } from 'react';
import { PROFILE_BASE_SELECT } from '@/src/lib/profileSelect';
import { getRequestClient } from './getCachedUser';
import { getYunikoServerUser } from '../yuniko/server-auth';

export const getAuthProfile = cache(async () => {
   const user = await getYunikoServerUser();
   if (!user?.authUserId) return null;
   const supabase = await getRequestClient();
   const { data: profile } = await supabase
      .from('profiles')
      .select(PROFILE_BASE_SELECT)
      .eq('id', user.authUserId)
      .single();
   return profile;
});

export type Profile = Awaited<ReturnType<typeof getAuthProfile>>;
