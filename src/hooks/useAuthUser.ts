import { useQuery } from '@tanstack/react-query';
import { normalizeYunikoAuthUser, yunikoApiFetch, type YunikoAuthUser } from '@/src/lib/yuniko/api';
import { queryKeys } from '@/src/lib/queryKeys';

export function useAuthUser() {
   return useQuery({
      queryKey: queryKeys.authUser(),
      queryFn: async (): Promise<YunikoAuthUser | null> => {
         const response = await yunikoApiFetch('/auth/me');
         if (response.status === 401) return null;
         if (!response.ok) throw new Error('Failed to get auth user');
         return normalizeYunikoAuthUser(await response.json());
      },
      staleTime: Infinity,
   });
}
