'use server';
import 'server-only';
import { throwIfError } from '@/src/lib/unwrap';
import { SearchProfilesSchema, validate } from '@/src/lib/validation';
import { getOptionalUser } from '../getAuthUser';
import { getSupabaseAdmin } from '@/src/lib/yuniko/server-api';

export async function searchProfiles(options: {
   search?: string;
   limit?: number;
   excludeId?: string;
}) {
   const validated = validate(SearchProfilesSchema, options);
   const { user } = await getOptionalUser();

   if (!user) return [];

   const supabase = getSupabaseAdmin();

   let q = supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .order('created_at', { ascending: false })
      .limit(validated.limit ?? 10);

   if (validated.search) {
      const trimmed = validated.search.trim();
      if (trimmed) {
         q = q.or('username.ilike.%' + trimmed + '%,display_name.ilike.%' + trimmed + '%');
      }
   }

   if (validated.excludeId) {
      q = q.neq('id', Number(validated.excludeId));
   } else {
      q = q.neq('id', Number(user.id));
   }

   const { data, error } = await q;
   throwIfError({ error }, 'Failed to search users');

   return (data ?? []).map(row => ({
      id: String(row.id),
      username: row.username,
      full_name: row.display_name,
      avatar_url: row.avatar_url,
      is_private: false,
   }));
}
