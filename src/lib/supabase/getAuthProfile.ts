import 'server-only';

import { cache } from 'react';
import { PROFILE_BASE_SELECT } from '@/src/lib/profileSelect';
import { getRequestClient } from './getCachedUser';
import { getYunikoServerUser } from '../yuniko/server-auth';

export const getAuthProfile = cache(async () => {
   const user = await getYunikoServerUser();
   if (!user) return null;

   const supabase = await getRequestClient();
   const { data: profile } = await supabase
      .from('profiles')
      .select(PROFILE_BASE_SELECT)
      .eq('username', user.username)
      .maybeSingle();

   if (profile) return profile;

   // Custom Yuniko auth stores identity in public.users rather than
   // Supabase Auth/profiles. Keep the existing profile consumers working
   // when a legacy profiles row does not exist yet.
   return {
      id: String(user.id),
      username: user.username,
      full_name: user.displayName,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      website: user.website,
      gender: null,
      hide_ai_content: false,
   };
});

export type Profile = Awaited<ReturnType<typeof getAuthProfile>>;
