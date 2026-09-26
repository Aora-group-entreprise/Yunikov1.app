'use server';
import 'server-only';
import { throwIfError } from '@/src/lib/unwrap';
import { getMuxClient } from '../../lib/mux';
import { getAuthUser } from '../getAuthUser';

export async function deleteAccount() {
   const { supabase, user } = await getAuthUser();

   const [{ data: postVideos }, { data: storyVideos }] = await Promise.all([
      supabase
         .from('post_videos')
         .select('mux_asset_id, posts!inner(user_id)')
         .eq('posts.user_id', user.id)
         .not('mux_asset_id', 'is', null),
      supabase
         .from('story_videos')
         .select('mux_asset_id, stories!inner(user_id)')
         .eq('stories.user_id', user.id)
         .not('mux_asset_id', 'is', null),
   ]);

   const { yunikoApiFetch } = await import('@/src/lib/yuniko/api');
   const response = await yunikoApiFetch('/auth/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }),
   });
   if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? 'Failed to delete account');
   }

   const assetIds = [
      ...(postVideos ?? []).map(v => v.mux_asset_id as string),
      ...(storyVideos ?? []).map(v => v.mux_asset_id as string),
   ];

   if (assetIds.length) {
      const mux = getMuxClient();
      await Promise.allSettled(assetIds.map(id => mux.video.assets.delete(id)));
   }
}
