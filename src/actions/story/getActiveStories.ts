'use server';
import 'server-only';

import { getHideAiContent } from '@/src/lib/getHideAiContent';
import { getSupabaseAdmin } from '@/src/lib/yuniko/server-api';
import { throwIfError } from '@/src/lib/unwrap';
import { activeStoriesQuery, extractStoryMedia } from '@/src/queries/stories';
import type { UnsplashAttribution } from '../../types/unsplash';
import { getOptionalUser } from '../getAuthUser';

export async function getActiveStories() {
   const { user } = await getOptionalUser();
   const supabase = getSupabaseAdmin();

   // Yuniko API owns authentication. The API session is not a Supabase Auth
   // session on the Next.js server, so do not issue an RLS-protected stories
   // query without a verified server-side identity.
   if (!user) {
      return { entries: [], viewedStoryIds: [], reactedStoryIds: [] };
   }

   const currentUserId = user.id;
   const hideAi = await getHideAiContent();

   const { data, error } = await activeStoriesQuery(supabase, hideAi);

   throwIfError({ error }, 'Failed to fetch stories');

   const grouped = new Map<
      string,
      {
         userId: string;
         slug: string;
         username: string;
         avatarUrl: string | null;
         timestamp: string;
         stories: Array<{
            storyId: string;
            type: 'image' | 'video';
            url: string;
            blurDataUrl: string | null;
            unsplashAttribution: UnsplashAttribution | null;
            timestamp: string;
         }>;
      }
   >();

   const viewedStoryIds: string[] = [];
   const reactedStoryIds: string[] = [];

   for (const row of data ?? []) {
      const profile = row.users as unknown as { username: string; avatar_url: string | null } | null;
      if (!profile) continue;

      const views = row.story_views;
      const reactions = row.story_reactions;

      const media = extractStoryMedia(row as unknown as { media_url: string | null; media_type: string | null });
      if (!media) continue;

      const isViewed = currentUserId !== null && views.some(v => v.viewer_id === currentUserId);
      if (isViewed) viewedStoryIds.push(row.id);

      const isReacted = currentUserId !== null && reactions.some(r => r.user_id === currentUserId);
      if (isReacted) reactedStoryIds.push(row.id);

      if (!grouped.has(row.user_id)) {
         grouped.set(row.user_id, {
            userId: row.user_id,
            slug: profile.username,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            timestamp: row.created_at ?? '',
            stories: [],
         });
      }

      const entry = grouped.get(row.user_id);
      if (!entry) continue;
      if (row.created_at && row.created_at > entry.timestamp) {
         entry.timestamp = row.created_at;
      }
      entry.stories.push({
         storyId: row.id,
         type: media.type,
         url: media.url,
         blurDataUrl: media.blurDataUrl,
         unsplashAttribution: media.type === 'image' ? (media.unsplashAttribution ?? null) : null,
         timestamp: row.created_at ?? '',
      });
   }

   const entries = Array.from(grouped.values()).sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
   );

   return { entries, viewedStoryIds, reactedStoryIds };
}

export type StoryEntry = Awaited<ReturnType<typeof getActiveStories>>['entries'][number];
