import { useQuery } from '@tanstack/react-query';
import { PROFILE_BASE_SELECT } from '@/src/lib/profileSelect';
import { queryKeys } from '@/src/lib/queryKeys';
import { supabase } from '@/src/lib/supabase/client';

export function useAuthUser() {
   return useQuery({
      queryKey: queryKeys.authUser(),
      queryFn: async () => {
         const response = await fetch('/api/auth/me', { cache: 'no-store' });
         if (!response.ok) throw new Error(response.status === 401 ? 'No auth user' : 'Failed to get auth user');
         const user = await response.json();
         if (!user?.authUserId) throw new Error('Yuniko account is not linked to a Supabase profile');

         const { data: profile, error } = await supabase
            .from('profiles')
            .select(PROFILE_BASE_SELECT)
            .eq('id', user.authUserId)
            .single();

         if (error) throw new Error('Failed to get profile');
         return profile;
      },
      staleTime: Infinity,
   });
}
