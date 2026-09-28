import 'server-only';

import { getHomeFeedPosts } from '@/src/actions/post/getHomeFeedPosts';
import FeedList from './FeedList';

export default async function HomepageFeed({ variant }: { variant: 'home' | 'following' }) {
   let initialPage;

   try {
      initialPage = await getHomeFeedPosts({ variant });
   } catch (error) {
      console.error('[Yuniko] Initial home feed unavailable:', error);
      initialPage = { posts: [], nextCursor: null };
   }

   return <FeedList variant={variant} initialPage={initialPage} />;
}
