'use server';
import 'server-only';

import { cookies } from 'next/headers';
import { UsernameParamSchema, validate } from '@/src/lib/validation';

function getApiBaseUrl(headers: Headers): string {
   const configured = process.env.NEXT_PUBLIC_YUNIKO_API_URL?.trim();
   if (configured) return configured.replace(/\/+$/, '').replace(/\/api$/, '');
   const host = headers.get('host');
   if (host) {
      const protocol = headers.get('x-forwarded-proto') ?? 'https';
      return `${protocol}://${host}`;
   }
   return 'https://yunikov1-app-api.lafatriniainaallane.workers.dev';
}

function mapPost(post: Record<string, any>) {
   return {
      id: String(post.id),
      user_id: String(post.userId),
      caption: post.caption ?? '',
      created_at: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt ?? ''),
      aspect_ratio: post.aspectRatio ?? '1/1',
      hide_likes: Boolean(post.hideLikes),
      type: post.type ?? (post.mediaUrl ? 'image' : 'text'),
      like_count: Number(post.likes ?? 0),
      comment_count: Number(post.comments ?? 0),
      repost_count: Number(post.shares ?? 0),
      comments_off: Boolean(post.commentsOff),
      location_name: post.location ?? null,
      likes: post.liked ? [{ user_id: String(post.userId) }] : [],
      saves: post.saved ? [{ user_id: String(post.userId) }] : [],
      reposts: [],
      user: {
         id: String(post.userId),
         username: post.authorUsername ?? '',
         full_name: post.authorDisplayName ?? null,
         avatar_url: post.authorAvatarUrl ?? null,
         is_verified: false,
      },
      images: Array.isArray(post.images) ? post.images.map((image: Record<string, any>) => ({
         id: String(image.id),
         url: image.url ?? null,
         position: Number(image.position ?? 0),
         width: image.width ?? null,
         height: image.height ?? null,
         blur_data_url: image.blurDataUrl ?? null,
         alt_text: image.altText ?? null,
      })) : [],
      videos: Array.isArray(post.videos) ? post.videos.map((video: Record<string, any>) => ({
         id: String(video.id),
         mux_playback_id: video.muxPlaybackId ?? null,
         duration: video.duration ?? null,
         position: Number(video.position ?? 0),
         width: video.width ?? null,
         height: video.height ?? null,
      })) : [],
   };
}

export async function getUserProfileWithPosts(params: { username: string }) {
   const { username } = validate(UsernameParamSchema, params);
   const cookieHeader = (await cookies()).toString();
   if (!cookieHeader) throw new Error('Unauthorized');

   const requestHeaders = new Headers({
      cookie: cookieHeader,
      accept: 'application/json',
   });

   const baseUrl = getApiBaseUrl(requestHeaders);
   const res = await fetch(
      `${baseUrl}/api/users/by-username/${encodeURIComponent(username.trim().toLowerCase())}`,
      { method: 'GET', headers: requestHeaders, cache: 'no-store' },
   );
   const payload = await res.json().catch(() => ({}));

   if (!res.ok) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : `Failed to fetch profile (${res.status})`);
   }

   const data = payload as {
      user?: Record<string, any>;
      posts?: Record<string, any>[];
      stats?: { posts?: number; followers?: number; following?: number };
      following?: boolean;
      privateAccount?: boolean;
   };

   if (!data.user) throw new Error('Failed to fetch profile: no user returned');

   const userProfile = {
      id: String(data.user.id),
      username: data.user.username ?? username,
      full_name: data.user.displayName ?? '',
      bio: data.user.bio ?? '',
      avatar_url: data.user.avatarUrl ?? null,
      avatar_attribution: null,
      website: data.user.website ?? null,
      is_verified: data.user.verificationStatus === 'verified',
      is_private: Boolean(data.privateAccount),
      followers: [{ count: Number(data.stats?.followers ?? 0) }],
      following: [{ count: Number(data.stats?.following ?? 0) }],
   };

   return {
      userProfile,
      posts: (data.posts ?? []).map(mapPost),
      followStatus: data.following ? 'following' as const : 'none' as const,
   };
}

export type ProfileWithPosts = Awaited<ReturnType<typeof getUserProfileWithPosts>>;
