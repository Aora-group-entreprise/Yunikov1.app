import type { QueryData, SupabaseClient } from '@supabase/supabase-js';
import { DB_NOW } from '@/src/lib/dbTime';
import type { Database } from '@/src/types/database';
import { scopePostEngagementToUser } from '@/src/utils/posts';

export const POST_WITH_MEDIA_SELECT = `
   id, user_id, caption, type, created_at, location_name,
   like_count, comment_count, repost_count, hide_likes,
   likes(user_id),
   saves(user_id),
   reposts(user_id),
   user:profiles!posts_user_id_fkey(id, username, full_name, avatar_url),
   images:post_images(id, url, position, width, height, blur_data_url, alt_text, unsplash_attribution),
   videos:post_videos(id, mux_playback_id, duration, position, width, height)
` as const;

export function postsWithMediaQuery(supabase: SupabaseClient<Database>) {
   return supabase
      .from('posts')
      .select(POST_WITH_MEDIA_SELECT)
      .lte('created_at', DB_NOW)
      .order('created_at', { ascending: false })
      .limit(10);
}

export type PostsWithMedia = Array<{
   [key: string]: any;
   id: string | number;
   user_id: string;
   created_at: string | null;
   caption?: string | null;
   type?: string;
   location_name?: string | null;
   like_count?: number;
   comment_count?: number;
   repost_count?: number;
   hide_likes?: boolean;
   user?: {
      id: string;
      username?: string;
      full_name?: string | null;
      avatar_url?: string | null;
   } | null;
   images?: Array<{
      id: string | number;
      url: string | null;
      position: number;
      width?: number | null;
      height?: number | null;
      blur_data_url?: string | null;
      alt_text?: string | null;
      unsplash_attribution?: unknown;
      tags?: unknown[];
   }>;
   videos?: Array<{
      id: string | number;
      mux_playback_id: string | null;
      duration?: number | null;
      position: number;
      width?: number | null;
      height?: number | null;
   }>;
}>;
export type PostWithMedia = PostsWithMedia[number];

export function userRecentPostsQuery(supabase: SupabaseClient<Database>, userId: string) {
   return supabase
      .from('posts')
      .select(
         'id, images:post_images(url, position), videos:post_videos(mux_playback_id, position)',
      )
      .eq('user_id', userId)
      .lte('created_at', DB_NOW)
      .order('created_at', { ascending: false })
      .limit(3);
}

export type UserRecentPosts = QueryData<ReturnType<typeof userRecentPostsQuery>>;
export type UserRecentPost = UserRecentPosts[number];

export const REELS_PAGE_SIZE = 10;

export function reelsQuery(
   supabase: SupabaseClient<Database>,
   userId?: string,
   cursor?: string | null,
   hideAi?: boolean,
) {
   let query = supabase
      .from('posts')
      .select(POST_WITH_MEDIA_SELECT)
      .eq('type', 'video')
      .lte('created_at', DB_NOW)
      .order('created_at', { ascending: false })
      .limit(REELS_PAGE_SIZE);

   if (userId) {
      query = scopePostEngagementToUser(query, userId);
   }
   if (cursor) {
      query = query.lt('created_at', cursor);
   }

   return query;
}

export type Reels = QueryData<ReturnType<typeof reelsQuery>>;
export type Reel = Reels[number];

export function savedPostsQuery(
   supabase: SupabaseClient<Database>,
   userId: string,
   hideAi?: boolean,
) {
   let query = supabase
      .from('saves')
      .select(`post_id, post:posts!post_id(${POST_WITH_MEDIA_SELECT})`)
      .eq('user_id', userId)
      .lte('post.created_at', DB_NOW);

   query = scopePostEngagementToUser(query, userId, 'post');

   query = query.order('created_at', { ascending: false });

   return query;
}

export type SavedPosts = QueryData<ReturnType<typeof savedPostsQuery>>;
export type SavedPost = SavedPosts[number];
