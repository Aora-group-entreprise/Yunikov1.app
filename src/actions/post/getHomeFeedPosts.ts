'use server';
import 'server-only';
import { DB_NOW } from '@/src/lib/dbTime';
import { getHideAiContent } from '@/src/lib/getHideAiContent';
import { getSupabaseAdmin } from '@/src/lib/yuniko/server-api';
import { CursorSchema, validate } from '@/src/lib/validation';
import { throwIfError } from '../../lib/unwrap';
import type { PostsWithMedia } from '../../queries/posts';
import { POST_WITH_MEDIA_SELECT } from '../../queries/posts';
import { applyVisibleCommentCount, hideLikesForNonOwners, nextCursorFrom } from '../../utils/posts';
import { getOptionalUser } from '../getAuthUser';

const PAGE_SIZE = 10;

export interface HomeFeedPage {
   posts: PostsWithMedia;
   nextCursor: string | null;
}

export async function getHomeFeedPosts(params: {
   variant: 'home' | 'following';
   cursor?: string | null;
}) {
   const { variant, cursor } = validate(CursorSchema, params);
   const { user } = await getOptionalUser();
   const supabase = getSupabaseAdmin();

   if (!user) {
      return { posts: [], nextCursor: null };
   }

   const hideAi = await getHideAiContent();

   if (variant === 'home') {
      let query = supabase
         .from('posts')
         .select(POST_WITH_MEDIA_SELECT)
         .lte('created_at', DB_NOW)
         .is('deleted_at', null)
         .order('created_at', { ascending: false })
         .limit(PAGE_SIZE);

      if (cursor) query = query.lt('created_at', cursor);

      const { data, error } = await query;
      throwIfError({ error }, 'Failed to fetch home feed');

      const normalizedPosts = (data ?? []).map(post => {
         const raw = post as typeof post & {
            media_url: string | null;
            media_type: string | null;
         };
         const userProfile = Array.isArray(post.user) ? post.user[0] : post.user;
         const images = post.images ?? [];

         return {
            ...post,
            type: raw.media_type === 'video' ? 'reel' : 'post',
            aspect_ratio: 'original',
            hide_likes: false,
            comments_off: false,
            user: userProfile
               ? {
                    ...userProfile,
                    id: String(userProfile.id),
                    full_name: userProfile.display_name,
                    is_private: false,
                    is_verified: false,
                 }
               : {
                    id: String(post.user_id),
                    username: 'unknown',
                    full_name: null,
                    avatar_url: null,
                    is_private: false,
                    is_verified: false,
                 },
            collaborators: [],
            reposts: [],
            images:
               images.length > 0 || !raw.media_url || raw.media_type === 'video'
                  ? images
                  : [
                       {
                          id: String(post.id),
                          url: raw.media_url,
                          position: 0,
                          width: null,
                          height: null,
                          blur_data_url: null,
                          alt_text: null,
                          unsplash_attribution: null,
                          tags: [],
                       },
                    ],
            videos:
               raw.media_type === 'video' && raw.media_url
                  ? [
                       {
                          id: String(post.id),
                          mux_playback_id: raw.media_url,
                          duration: null,
                          position: 0,
                          width: null,
                          height: null,
                       },
                    ]
                  : [],
         };
      });

      const posts = applyVisibleCommentCount(normalizedPosts) as PostsWithMedia;
      return {
         posts: hideLikesForNonOwners(posts, user.id),
         nextCursor: nextCursorFrom(posts, PAGE_SIZE),
      };
   }

   const { data: postIds, error: rpcError } = await supabase.rpc('get_following_posts', {
      p_follower_id: user.id,
      before_cursor: cursor ?? undefined,
      page_size: PAGE_SIZE,
   });

   throwIfError({ error: rpcError }, 'Failed to fetch following feed');
   if (!postIds || postIds.length === 0) {
      return { posts: [], nextCursor: null };
   }

   const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(POST_WITH_MEDIA_SELECT)
      .in(
         'id',
         postIds.map((p: { id: string | number }) => p.id),
      )
      .is('deleted_at', null)
      .lte('created_at', DB_NOW)
      .order('created_at', { ascending: false });

   throwIfError({ error: postsError }, 'Failed to fetch following feed');

   const normalizedPosts = (posts ?? []).map(post => {
      const raw = post as typeof post & {
         media_url: string | null;
         media_type: string | null;
      };
      const userProfile = Array.isArray(post.user) ? post.user[0] : post.user;
      const images = post.images ?? [];

      return {
         ...post,
         type: raw.media_type === 'video' ? 'reel' : 'post',
         aspect_ratio: 'original',
         hide_likes: false,
         comments_off: false,
         user: userProfile
            ? {
                 ...userProfile,
                 id: String(userProfile.id),
                 full_name: userProfile.display_name,
                 is_private: false,
                 is_verified: false,
              }
            : {
                 id: String(post.user_id),
                 username: 'unknown',
                 full_name: null,
                 avatar_url: null,
                 is_private: false,
                 is_verified: false,
              },
         collaborators: [],
         reposts: [],
         images:
            images.length > 0 || !raw.media_url || raw.media_type === 'video'
               ? images
               : [
                    {
                       id: String(post.id),
                       url: raw.media_url,
                       position: 0,
                       width: null,
                       height: null,
                       blur_data_url: null,
                       alt_text: null,
                       unsplash_attribution: null,
                       tags: [],
                    },
                 ],
         videos:
            raw.media_type === 'video' && raw.media_url
               ? [
                    {
                       id: String(post.id),
                       mux_playback_id: raw.media_url,
                       duration: null,
                       position: 0,
                       width: null,
                       height: null,
                    },
                 ]
               : [],
      };
   });

   const safePosts = applyVisibleCommentCount(normalizedPosts) as PostsWithMedia;
   const nextCursor = nextCursorFrom(postIds, PAGE_SIZE);
   return { posts: hideLikesForNonOwners(safePosts, user.id), nextCursor };
}
