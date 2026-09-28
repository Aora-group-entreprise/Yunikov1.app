import type { QueryData, SupabaseClient } from '@supabase/supabase-js';
import { DB_NOW } from '@/src/lib/dbTime';
import type { Database } from '@/src/types/database';
import { parseUnsplashAttribution } from '@/src/types/unsplash';

export const ACTIVE_STORIES_SELECT = `
   *,
   users!stories_user_id_fkey(username, avatar_url),
   story_views(viewer_id),
   story_reactions(user_id)
`;

function getOneMonthAgoISO() {
   const date = new Date();
   date.setMonth(date.getMonth() - 1);
   return date.toISOString();
}

export function activeStoriesQuery(supabase: SupabaseClient<Database>, hideAi = false) {
   const oneMonthAgo = getOneMonthAgoISO();
   let query = supabase
      .from('stories')
      .select(ACTIVE_STORIES_SELECT)
      .gt('expires_at', DB_NOW)
      .lte('created_at', DB_NOW)
      .gte('created_at', oneMonthAgo)
      .order('created_at', { ascending: true });

   if (hideAi) {
      query = query.eq('is_ai', false);
   }

   return query;
}

export type ActiveStories = QueryData<ReturnType<typeof activeStoriesQuery>>;
export type ActiveStory = ActiveStories[number];

interface StoryMediaRow {
   media_url?: string | null;
   media_type?: string | null;
   story_images?: Array<{
      url?: string | null;
      blur_data_url?: string | null;
      unsplash_attribution?: unknown;
   }> | null;
   story_videos?: Array<{
      mux_playback_id?: string | null;
   }> | null;
}

export function extractStoryMedia(row: StoryMediaRow) {
   if (row.media_url) {
      if (row.media_type === 'video') {
         return {
            type: 'video' as const,
            url: row.media_url,
            blurDataUrl: null,
         };
      }

      return {
         type: 'image' as const,
         url: row.media_url,
         blurDataUrl: null,
         unsplashAttribution: null,
      };
   }

   const image = row.story_images?.find(item => item.url);
   if (image?.url) {
      return {
         type: 'image' as const,
         url: image.url,
         blurDataUrl: image.blur_data_url ?? null,
         unsplashAttribution: parseUnsplashAttribution(image.unsplash_attribution),
      };
   }

   const video = row.story_videos?.find(item => item.mux_playback_id);
   if (video?.mux_playback_id) {
      return {
         type: 'video' as const,
         url: `https://stream.mux.com/${video.mux_playback_id}.m3u8`,
         blurDataUrl: null,
      };
   }

   return null;
}

export async function getStoryRingState(
   supabase: SupabaseClient<Database>,
   userId: string,
   authUserId: string | null,
   hideAi = false,
) {
   const now = new Date().toISOString();
   const oneMonthAgo = getOneMonthAgoISO();
   let query = supabase
      .from('stories')
      .select('id, story_views(viewer_id)')
      .eq('user_id', userId)
      .gt('expires_at', now)
      .lte('created_at', now)
      .gte('created_at', oneMonthAgo);

   if (hideAi) {
      query = query.eq('is_ai', false);
   }

   const { data: stories } = await query;

   if (!stories || stories.length === 0) {
      return { hasStories: false, allStoriesViewed: false };
   }

   return {
      hasStories: true,
      allStoriesViewed:
         authUserId !== null &&
         stories.every(story => story.story_views?.some(view => view.viewer_id === authUserId)),
   };
}
