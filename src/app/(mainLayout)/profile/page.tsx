import { getYunikoServerUser } from '@/src/lib/yuniko/server-auth';
import ProfilePage from '@/src/pageComponents/Profile';
import { loadProfilePage } from './[username]/loadProfilePage';

export default async function Profile() {
   const user = await getYunikoServerUser();

   if (!user) throw new Error('Unauthorized');

   const result = await loadProfilePage(user.username, { includeSaved: true });

   return <ProfilePage {...result} isOwnProfile />;
}
