import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/database';

export type FollowState = 'following' | 'requested' | 'none';

export async function getFollowStatus(
   supabase: SupabaseClient<Database>,
   authUserId: string,
   targetUserId: string,
) {
   const { data: followData } = await supabase
      .from('follows')
      .select('follower_id, status')
      .eq('follower_id', String(Number(authUserId)))
      .eq('following_id', String(Number(targetUserId)))
      .maybeSingle();

   if (!followData) return 'none' as const;
   return followData.status === 'accepted' ? 'following' as const : 'requested' as const;
}

export async function getBatchFollowStatuses(
   supabase: SupabaseClient<Database>,
   authUserId: string,
   targetIds: string[],
) {
   if (targetIds.length === 0) return {};

   const { data: followData } = await supabase
      .from('follows')
      .select('following_id, status')
      .eq('follower_id', String(Number(authUserId)))
      .in('following_id', targetIds.map((id) => String(Number(id))));

   const result: Record<string, FollowState> = {};
   for (const id of targetIds) result[id] = 'none';

   for (const row of followData ?? []) {
      result[String(row.following_id)] =
         row.status === 'accepted' ? 'following' : 'requested';
   }

   return result;
}
