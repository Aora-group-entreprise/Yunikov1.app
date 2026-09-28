import ProfilePage from '@/src/pageComponents/Profile';
import RuntimeErrorDetails from '@/src/components/RuntimeErrorDetails';
import { loadProfilePage } from './loadProfilePage';

interface ProfilePageProps {
   params: Promise<{
      username: string;
   }>;
}

export default async function Profile({ params }: ProfilePageProps) {
   const { username } = await params;
   try {
      const profileData = await loadProfilePage(username);

      return (
      <ProfilePage
         userProfile={profileData.userProfile}
         posts={profileData.posts}
         followStatus={profileData.followStatus}
         isOwnProfile={profileData.isOwnProfile}
         note={profileData.note}
         ringState={profileData.ringState}
         highlights={profileData.highlights}
         repostedPosts={profileData.repostedPosts}
         savedPosts={profileData.savedPosts}
      />
      );
   } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      console.error('[Yuniko] Profile real error:', normalized);
      return <RuntimeErrorDetails title={`Erreur réelle du profil @${username}`} message={normalized.message} stack={normalized.stack} />;
   }
}
