create or replace function public.yuniko_verify_password(
  p_username text,
  p_password text
)
returns table(
  id integer,
  username text,
  display_name text,
  avatar_url text,
  country text,
  country_flag text,
  age integer,
  bio text,
  website text,
  verification_status text,
  created_at timestamp without time zone
)
language sql
security definer
set search_path to 'public', 'extensions'
as $function$
  select u.id,u.username,u.display_name,u.avatar_url,u.country,u.country_flag,
         u.age,u.bio,u.website,u.verification_status,u.created_at
  from public.users u
  where lower(u.username)=lower(trim(p_username))
    and u.password_hash = extensions.crypt(
      p_password,
      case
        when left(u.password_hash, 4) = '$2b$'
          then '$2a$' || substring(u.password_hash from 5)
        else u.password_hash
      end
    )
  limit 1;
$function$;
