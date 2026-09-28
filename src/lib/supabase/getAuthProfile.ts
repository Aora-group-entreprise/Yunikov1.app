import 'server-only';

import { cache } from 'react';
import { getYunikoServerUser } from '../yuniko/server-auth';

export const getAuthProfile = cache(async () => {
   const user = await getYunikoServerUser();
   if (!user) return null;

   // Yuniko custom auth is the source of truth for the signed-in identity.
   // Do not query public.profiles here: the legacy table does not guarantee
   // the full_name column and is not required to render the home page.
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
