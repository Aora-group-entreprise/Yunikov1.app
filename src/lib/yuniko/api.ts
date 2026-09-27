const API_BASE_URL = (process.env.NEXT_PUBLIC_YUNIKO_API_URL ?? 'https://yuniko-api.lafatriniainaallane.workers.dev').replace(/\/+$/, '');

export interface YunikoAuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  countryFlag: string | null;
  age: number | null;
  bio: string;
  website: string | null;
  hide_ai_content?: boolean;
  createdAt: string;
}

export function normalizeYunikoAuthUser(data: unknown): YunikoAuthUser {
  const user = data as YunikoAuthUser & { id: string | number };
  return { ...user, id: String(user.id) };
}

export async function yunikoApiFetch(path: string, options: RequestInit = {}) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  const url = typeof window !== 'undefined' ? `/api${normalized}` : `${API_BASE_URL}/api${normalized}`;
  return fetch(url, { ...options, headers, credentials: 'include', cache: 'no-store' });
}

export async function yunikoApiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await yunikoApiFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

export { API_BASE_URL };
