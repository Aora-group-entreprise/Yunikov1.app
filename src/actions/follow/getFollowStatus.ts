'use server';
import 'server-only';
import { getSupabaseAdmin } from '@/src/lib/yuniko/server-api';
import {
   getBatchFollowStatuses as queryBatchFollowStatuses,
   getFollowStatus as queryFollowStatus,
} from '@/src/queries/followStatus';
import { getOptionalUser } from '../getAuthUser';

export async function getFollowStatus(targetUserId: string) {
   const { user } = await getOptionalUser();
   const supabase = getSupabaseAdmin();
   if (!user || !supabase) return 'none' as const;

   return queryFollowStatus(supabase, user.id, targetUserId);
}

export async function getBatchFollowStatuses(targetIds: string[]) {
   const { supabase, user } = await getOptionalUser();
   if (!user || !supabase || targetIds.length === 0) return {};

   return queryBatchFollowStatuses(supabase, user.id, targetIds);
}
