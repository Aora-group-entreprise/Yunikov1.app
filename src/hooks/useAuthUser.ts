import { useQuery } from '@tanstack/react-query';
import { yunikoApiFetch, type YunikoAuthUser } from '@/src/lib/yuniko/api';
import { queryKeys } from '@/src/lib/queryKeys';

export function useAuthUser() {
   return useQuery({
      queryKey: queryKeys.authUser(),
      queryFn: async (): Promise<YunikoAuthUser | null> => {
         const response = await yunikoApiFetch('/auth/me');
         if (response.status === 401) return null;
         if (!response.ok) throw new Error('Failed to get auth user');
         return await response.json() as YunikoAuthUser;
      },
      staleTime: Infinity,
   });
}
