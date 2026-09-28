import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://pqjrmtkfgwoocbvmwbby.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  '';

const SESSION_COOKIE = 'yuniko_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type YunikoUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  countryFlag: string | null;
  age: number | null;
  bio: string;
  website: string | null;
  verificationStatus: string;
  createdAt: string;
};

type DbUser = {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  country_flag: string | null;
  age: number | null;
  bio: string | null;
  website: string | null;
  verification_status: string;
  created_at: string;
};

export function getSupabaseAdmin() {
  if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function toPublicUser(user: DbUser): YunikoUser {
  return {
    id: String(user.id),
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    country: user.country,
    countryFlag: user.country_flag,
    age: user.age,
    bio: user.bio ?? '',
    website: user.website,
    verificationStatus: user.verification_status ?? 'none',
    createdAt: user.created_at,
  };
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmacSign(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input)));
}

export async function createSessionToken(user: YunikoUser) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Missing or invalid SESSION_SECRET');

  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: user.id,
        username: user.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
      }),
    ),
  );
  const input = header + '.' + payload;
  const signature = bytesToBase64Url(await hmacSign(input, secret));
  return input + '.' + signature;
}

export async function verifySessionToken(token: string | null) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || secret.length < 32) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedHeader = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  );
  if (header !== expectedHeader) return null;

  const expected = await hmacSign(header + '.' + payload, secret);
  const actual = base64UrlToBytes(signature);
  if (actual.length !== expected.length) return null;

  let equal = 0;
  for (let i = 0; i < expected.length; i++) equal |= expected[i] ^ actual[i];
  if (equal !== 0) return null;

  try {
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as {
      sub?: string;
      exp?: number;
    };
    if (!claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function getSessionToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();

  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)yuniko_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function getAuthenticatedUser(request: Request) {
  const claims = await verifySessionToken(getSessionToken(request));
  if (!claims) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('id,username,display_name,avatar_url,country,country_flag,age,bio,website,verification_status,created_at')
    .eq('id', Number(claims.sub))
    .maybeSingle();

  if (error || !data) return null;
  return toPublicUser(data as DbUser);
}
