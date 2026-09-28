import type { QueryData, SupabaseClient } from '@supabase/supabase-js';
import { DB_NOW } from '@/src/lib/dbTime';
import type { Database } from '@/src/types/database';
import { scopePostEngagementToUser } from '@/src/utils/posts';

export const POST_WITH_MEDIA_SELECT = `
   id, user_id, caption, media_url, media_type, created_at,
   location_name:location,
   like_count:likes, comment_count:comments, repost_count:reposts,
   likes(user_id),
   saves(user_id),
   user:users!posts_user_id_fkey(id, username, display_name, avatar_url),
   images:post_media(id, url, position, width, height, blurhash, status)
` as const;

export function postsWithMediaQuery(supabase: SupabaseClient<Database>) {
   return supabase
      .from('posts')
      .select(POST_WITH_MEDIA_SELECT)
      .lte('created_at', DB_NOW)
      .order('created_at', { ascending: false })
      .limit(10);
}

export type PostsWithMedia = QueryData<ReturnType<typeof postsWithMediaQuery>>;
export type PostWithMedia = PostsWithMedia[number];

export function userRecentPostsQuery(supabase: SupabaseClient<Database>, userId: string) {
   return supabase
      .from('posts')
      .select(
         'id, images:post_media(url, position), videos:post_media(url, position)',
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
      .eq('media_type', 'video')
      .lte('created_at', DB_NOW)
      .order('created_at', { ascending: false })
      .limit(REELS_PAGE_SIZE);

   if (hideAi) {
      query = query.eq('is_ai', false);
   }

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

   if (hideAi) {
      query = query.eq('post.is_ai', false);
   }

   return query;
}

export type SavedPosts = QueryData<ReturnType<typeof savedPostsQuery>>;
export type SavedPost = SavedPosts[number];
