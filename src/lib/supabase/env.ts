const DEFAULT_SUPABASE_URL = 'https://pqjrmtkfgwoocbvmwbby.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EcRG6tql7D2aWdCrzq3yEw_R_AjEHV0';

export function getSupabaseEnv() {
   const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
   const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

   return { url, key };
}
