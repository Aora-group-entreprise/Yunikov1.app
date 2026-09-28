'use server';
import 'server-only';

import { cookies, headers } from 'next/headers';
import { CursorSchema, validate } from '@/src/lib/validation';
import type { PostsWithMedia } from '../../queries/posts';

const PAGE_SIZE = 50;

type ApiFeedPost = {
   id: number | string;
   userId: number | string;
   caption?: string | null;
   mediaUrl?: string | null;
   location?: string | null;
   likes?: number | null;
   comments?: number | null;
   shares?: number | null;
   saves?: number | null;
   createdAt?: string | null;
   authorDisplayName?: string | null;
   authorUsername?: string | null;
   authorAvatarUrl?: string | null;
   liked?: boolean;
   saved?: boolean;
};

type ApiFeedResponse = {
   posts?: ApiFeedPost[];
};

function getApiBaseUrl(requestHeaders: Headers): string {
   // The feed API lives in the same Cloudflare Worker as the app.
   // Build the origin from the incoming request so stale Cloudflare vars
   // cannot send server-side rendering to an older Worker URL.
   const host =
      requestHeaders.get('x-forwarded-host') ??
      requestHeaders.get('host');

   if (host) {
      const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
      return `${protocol}://${host}`;
   }

   const configured = (
      process.env.YUNIKO_API_URL ??
      process.env.NEXT_PUBLIC_YUNIKO_API_URL ??
      ''
   ).trim();

   if (configured) {
      let baseUrl = configured;
      while (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      if (baseUrl.endsWith('/api')) baseUrl = baseUrl.slice(0, -4);
      return baseUrl;
   }

   return 'https://yunikov1-app-api.lafatriniainaallane.workers.dev';
}
function mapApiPost(post: ApiFeedPost): PostsWithMedia[number] {
   const id = String(post.id);
   const userId = String(post.userId);
   const mediaUrl = post.mediaUrl ?? null;

   return {
      id,
      user_id: userId,
      caption: post.caption ?? null,
      created_at: post.createdAt ?? new Date().toISOString(),
      aspect_ratio: 'original',
      location_name: post.location ?? null,
      like_count: Number(post.likes ?? 0),
      comment_count: Number(post.comments ?? 0),
      repost_count: Number(post.shares ?? 0),
      hide_likes: false,
      comments_off: false,
      likes: post.liked ? [{ user_id: userId }] : [],
      saves: post.saved ? [{ user_id: userId }] : [],
      reposts: [],
      user: {
         id: userId,
         username: post.authorUsername ?? 'unknown',
         full_name: post.authorDisplayName ?? null,
         avatar_url: post.authorAvatarUrl ?? null,
      },
      images: mediaUrl
         ? [{
              id: `${id}-media`,
              url: mediaUrl,
              position: 0,
              width: null,
              height: null,
              blur_data_url: null,
              alt_text: null,
           }]
         : [],
      videos: [],
      type: mediaUrl ? 'post' : 'text',
   };
}

export interface HomeFeedPage {
   posts: PostsWithMedia;
   nextCursor: string | null;
   errorMessage?: string;
   errorStack?: string;
}

export async function getHomeFeedPosts(params: {
   variant: 'home' | 'following';
   cursor?: string | null;
}): Promise<HomeFeedPage> {
   const { cursor } = validate(CursorSchema, params);
   const cookieHeader = (await cookies()).toString();
   if (!cookieHeader) return { posts: [], nextCursor: null };

   try {
      const baseUrl = getApiBaseUrl(await headers());
      const query = new URLSearchParams();
      if (cursor) query.set('since', cursor);

      const response = await fetch(
         `${baseUrl}/api/posts/feed${query.toString() ? `?${query.toString()}` : ''}`,
         {
            method: 'GET',
            headers: {
               cookie: cookieHeader,
               accept: 'application/json',
            },
            cache: 'no-store',
         },
      );

      const payload = await response.json().catch(() => ({} as ApiFeedResponse));
      if (!response.ok) {
         throw new Error(
            typeof (payload as { error?: unknown })?.error === 'string'
               ? String((payload as { error: string }).error)
               : `Failed to fetch home feed (${response.status})`,
         );
      }

      const apiPosts = Array.isArray(payload?.posts) ? payload.posts : [];
      return {
         posts: apiPosts.slice(0, PAGE_SIZE).map(mapApiPost),
         nextCursor: null,
      };
   } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      console.error('[Yuniko] Home feed real error:', normalized);
      return {
         posts: [],
         nextCursor: null,
         errorMessage: normalized.message,
         errorStack: normalized.stack,
      };
   }
}
