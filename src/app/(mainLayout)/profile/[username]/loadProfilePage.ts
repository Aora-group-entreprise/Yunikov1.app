import { cookies } from 'next/headers';
import { getYunikoServerUser } from '@/src/lib/yuniko/server-auth';
import { yunikoApiFetch } from '@/src/lib/yuniko/api';
import type { ProfileWithPosts } from '@/src/actions/profile/getUserProfileWithPosts';

type ApiProfileResponse = {
   user: {
      id: number | string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
      website?: string | null;
      country?: string | null;
      verificationStatus?: string | null;
   };
   posts: Array<Record<string, any>>;
   stats: { posts: number; followers: number; following: number };
   following: boolean;
   privateAccount: boolean;
};

async function fetchProfileFromYuniko(username: string): Promise<ApiProfileResponse> {
   const user = await getYunikoServerUser();
   if (!user) throw new Error('Unauthorized');

   const response = await yunikoApiFetch(
      `/users/by-username/${encodeURIComponent(username)}`,
      { headers: { cookie: (await cookies()).toString() } },
   );

   if (!response.ok) {
      const body = await response.text();
      throw new Error(`Yuniko profile API failed (${response.status}): ${body || response.statusText}`);
   }

   return response.json();
}

function toProfile(
   data: ApiProfileResponse['user'],
   stats: ApiProfileResponse['stats'],
   posts: ProfileWithPosts['posts'],
) {
   return {
      id: String(data.id),
      username: data.username,
      full_name: data.displayName ?? null,
      avatar_url: data.avatarUrl ?? null,
      avatar_attribution: null,
      bio: data.bio ?? null,
      website: data.website ?? null,
      gender: null,
      hide_ai_content: false,
      is_verified: data.verificationStatus === 'verified',
      is_private: false,
      followers: [{ count: stats.followers }],
      following: [{ count: stats.following }],
      posts,
   };
}

function toPost(post: Record<string, any>) {
   return {
      id: String(post.id),
      user_id: String(post.userId ?? post.user_id ?? ''),
      type: post.type ?? 'image',
      caption: post.caption ?? null,
      created_at: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt ?? new Date().toISOString()),
      aspect_ratio: post.aspectRatio ?? null,
      hide_likes: Boolean(post.hideLikes),
      comments_off: Boolean(post.commentsOff),
      location_name: post.locationName ?? post.location ?? null,
      like_count: Number(post.likeCount ?? post.likes ?? 0),
      comment_count: Number(post.commentCount ?? post.comments ?? 0),
      repost_count: Number(post.repostCount ?? post.shares ?? 0),
      visible_comment_count: [{ count: Number(post.commentCount ?? 0) }],
      likes: [],
      saves: [],
      reposts: [],
      user: null,
      collaborators: [],
      images: (post.images ?? []).map((image: any) => ({
         id: String(image.id),
         url: image.url ?? null,
         position: Number(image.position ?? 0),
         width: image.width ?? null,
         height: image.height ?? null,
         blur_data_url: image.blurDataUrl ?? null,
         alt_text: image.altText ?? null,
         unsplash_attribution: image.unsplashAttribution ?? null,
         tags: [],
      })),
      videos: (post.videos ?? []).map((video: any) => ({
         id: String(video.id),
         mux_playback_id: video.muxPlaybackId ?? null,
         duration: video.duration ?? null,
         position: Number(video.position ?? 0),
         width: video.width ?? null,
         height: video.height ?? null,
      })),
   };
}

export async function loadProfilePage(username: string, options?: { includeSaved?: boolean }) {
   const [authUser, profileData] = await Promise.all([
      getYunikoServerUser(),
      fetchProfileFromYuniko(username),
   ]);

   if (!authUser) throw new Error('Unauthorized');

   const posts = profileData.posts.map(toPost) as ProfileWithPosts['posts'];
   const userProfile = toProfile(profileData.user, profileData.stats, posts);
   const isOwnProfile = authUser.username === username;

   return {
      userProfile,
      posts,
      followStatus: (profileData.following ? 'following' : 'none') as ProfileWithPosts['followStatus'],
      isOwnProfile,
      note: null,
      ringState: { hasStories: false, allStoriesViewed: false },
      highlights: [],
      savedPosts: [],
      repostedPosts: [],
   };
}
