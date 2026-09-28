import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  getAuthenticatedUser,
  getSupabaseAdmin,
  sessionCookie,
  clearSessionCookie,
  toPublicUser,
} from '@/src/lib/yuniko/server-api';

function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(data, { status, headers: extraHeaders });
}

async function body(request: NextRequest) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function authLogin(request: NextRequest) {
  const input = await body(request);
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  if (!username || !password) return json({ error: 'Username and password are required' }, 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('yuniko_verify_password', {
    p_username: username,
    p_password: password,
  });
  if (error) {
    console.error('Yuniko login RPC failed', error);
    return json({ error: 'Authentication service unavailable' }, 503);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return json({ error: 'Invalid username or password' }, 401);

  const user = toPublicUser(row);
  const token = await createSessionToken(user);
  return json({ user }, 200, { 'Set-Cookie': sessionCookie(token) });
}

async function authRegister(request: NextRequest) {
  const input = await body(request);
  const username = typeof input?.username === 'string' ? input.username.trim().toLowerCase() : '';
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const country = typeof input?.country === 'string' ? input.country.trim() : '';
  const countryFlag = typeof input?.countryFlag === 'string' ? input.countryFlag.trim() : '';
  const age = typeof input?.age === 'number' ? input.age : Number(input?.age);
  const avatarUrl = typeof input?.avatarUrl === 'string' ? input.avatarUrl : null;

  if (!username || username.length < 3) return json({ error: 'Username must be at least 3 characters' }, 400);
  if (!/^[a-z0-9._]+$/.test(username)) return json({ error: 'Username contains invalid characters' }, 400);
  if (!displayName) return json({ error: 'Display name is required' }, 400);
  if (!password || password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
  if (!country) return json({ error: 'Country is required' }, 400);
  if (!Number.isInteger(age) || age < 13 || age > 120) return json({ error: 'Invalid age' }, 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('yuniko_create_user', {
    p_username: username,
    p_display_name: displayName,
    p_password: password,
    p_country: country,
    p_country_flag: countryFlag || null,
    p_age: age,
    p_avatar_url: avatarUrl,
  });

  if (error) {
    if (error.message.includes('USERNAME_TAKEN')) return json({ error: 'Username is already taken' }, 409);
    console.error('Yuniko registration RPC failed', error);
    return json({ error: 'Registration service unavailable' }, 503);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return json({ error: 'Registration failed' }, 500);

  const user = toPublicUser(row);
  const token = await createSessionToken(user);
  return json({ user }, 201, { 'Set-Cookie': sessionCookie(token) });
}

async function authMe(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  return json(user);
}

async function authResetPassword(request: NextRequest) {
  const input = await body(request);
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  const newPassword = typeof input?.newPassword === 'string' ? input.newPassword : '';
  if (!username || newPassword.length < 6) return json({ error: 'Invalid reset request' }, 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('yuniko_reset_password', {
    p_username: username,
    p_new_password: newPassword,
  });
  if (error) {
    console.error('Yuniko password reset failed', error);
    return json({ error: 'Password reset service unavailable' }, 503);
  }
  if (!data) return json({ error: 'User not found' }, 404);
  return json({ success: true });
}

async function checkUsername(username: string) {
  if (!username) return json({ available: false, error: 'Username is required' }, 400);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('users').select('id').ilike('username', username).maybeSingle();
  if (error) return json({ error: 'Username check unavailable' }, 503);
  return json({ available: !data });
}

async function userByUsername(request: NextRequest, username: string) {
  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser) return json({ error: 'Unauthorized' }, 401);

  const supabase = getSupabaseAdmin();
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id,username,display_name,avatar_url,country,country_flag,age,bio,website,verification_status,created_at')
    .ilike('username', username)
    .maybeSingle();

  if (userError) return json({ error: 'Profile lookup failed' }, 503);
  if (!userRow) return json({ error: 'User not found' }, 404);

  const user = toPublicUser(userRow);
  const userId = Number(userRow.id);

  const [{ count: postsCount }, { count: followersCount }, { count: followingCount }, followingResult, postsResult] =
    await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('follows').select('follower_id').eq('follower_id', Number(currentUser.id)).eq('following_id', userId).maybeSingle(),
      supabase
        .from('posts')
        .select('id,caption,media_url,media_type,media_items,location,likes,comments,shares,reposts,created_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60),
    ]);

  if (postsResult.error) return json({ error: 'Profile posts lookup failed' }, 503);

  const postIds = (postsResult.data ?? []).map(post => post.id);
  const mediaResult = postIds.length
    ? await supabase.from('post_media').select('id,post_id,url,width,height,blurhash,position').in('post_id', postIds).order('position')
    : { data: [], error: null };

  if (mediaResult.error) return json({ error: 'Profile media lookup failed' }, 503);

  const mediaByPost = new Map<number, Array<Record<string, unknown>>>();
  for (const media of mediaResult.data ?? []) {
    const list = mediaByPost.get(media.post_id) ?? [];
    list.push(media);
    mediaByPost.set(media.post_id, list);
  }

  const posts = (postsResult.data ?? []).map(post => {
    const media = mediaByPost.get(post.id) ?? [];
    let legacyItems: unknown[] = [];
    if (typeof post.media_items === 'string' && post.media_items) {
      try {
        const parsed = JSON.parse(post.media_items);
        if (Array.isArray(parsed)) legacyItems = parsed;
      } catch {}
    }

    const imageItems: Array<Record<string, unknown>> = media.length
      ? media
      : legacyItems.map((url, index) => ({ id: String(index), url, position: index }));
    const isVideo = post.media_type === 'video';

    return {
      id: String(post.id),
      type: isVideo ? 'video' : 'image',
      caption: post.caption,
      createdAt: post.created_at,
      aspectRatio: '1 / 1',
      locationName: post.location,
      likeCount: Number(post.likes ?? 0),
      commentCount: Number(post.comments ?? 0),
      repostCount: Number(post.reposts ?? 0),
      images: isVideo ? [] : imageItems.map(item => ({
        id: String(item.id),
        url: item.url ?? null,
        position: Number(item.position ?? 0),
        width: item.width ?? null,
        height: item.height ?? null,
        blurDataUrl: item.blurhash ?? null,
        altText: null,
        unsplashAttribution: null,
      })),
      videos: isVideo ? [{
        id: String(post.id),
        muxPlaybackId: null,
        url: post.media_url ?? (typeof imageItems[0]?.url === 'string' ? imageItems[0].url : null),
        duration: null,
        position: 0,
        width: null,
        height: null,
      }] : [],
    };
  });

  return json({
    user,
    stats: {
      posts: postsCount ?? 0,
      followers: followersCount ?? 0,
      following: followingCount ?? 0,
    },
    following: Boolean(followingResult.data),
    privateAccount: false,
    posts,
  });
}

async function handler(request: NextRequest) {
  const pathname = new URL(request.url).pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const parts = pathname.split('/').filter(Boolean);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204 });

  try {
    if (method === 'POST' && parts.join('/') === 'auth/login') return authLogin(request);
    if (method === 'POST' && parts.join('/') === 'auth/register') return authRegister(request);
    if (method === 'GET' && parts.join('/') === 'auth/me') return authMe(request);
    if (method === 'POST' && parts.join('/') === 'auth/logout') {
      return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    }
    if (method === 'POST' && parts.join('/') === 'auth/reset-password') return authResetPassword(request);
    if (method === 'GET' && parts[0] === 'auth' && parts[1] === 'check-username') {
      return checkUsername(decodeURIComponent(parts.slice(2).join('/')));
    }
    if (method === 'GET' && parts[0] === 'users' && parts[1] === 'by-username' && parts[2]) {
      return userByUsername(request, decodeURIComponent(parts.slice(2).join('/')));
    }
    return json({ error: 'API route not found' }, 404);
  } catch (error) {
    console.error('Yuniko API error', error);
    return json({ error: 'Internal API error' }, 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
