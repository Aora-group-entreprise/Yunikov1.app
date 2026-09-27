'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { YunikoAuthUser } from './api';
import { normalizeYunikoAuthUser, yunikoApiFetch } from './api';

interface AuthContextValue {
  user: YunikoAuthUser | null;
  isLoading: boolean;
  login: (user: YunikoAuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: YunikoAuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'yuniko_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<YunikoAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeUser = useCallback((next: YunikoAuthUser | null) => {
    setUser(next);
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const logout = useCallback(async () => {
    try { await yunikoApiFetch('/auth/logout', { method: 'POST' }); } finally { storeUser(null); }
  }, [storeUser]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await yunikoApiFetch('/auth/me');
      if (response.ok) {
        storeUser(normalizeYunikoAuthUser(await response.json()));
      } else if (response.status === 401) {
        storeUser(null);
      }
    } catch {
      // Keep the cached identity during a temporary network failure.
    }
  }, [storeUser]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await yunikoApiFetch('/auth/me');
        if (!active) return;
        if (response.ok) {
          storeUser(await response.json() as YunikoAuthUser);
        } else {
          // The JWT API is the source of truth. Never authenticate from a stale
          // localStorage identity when /auth/me is unavailable or unauthorized.
          storeUser(null);
        }
      } catch {
        // If the auth endpoint cannot be reached, fail closed instead of
        // treating a cached user as authenticated.
        if (active) storeUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [storeUser]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login: storeUser,
      logout,
      refreshUser,
      updateUser: storeUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useYunikoAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useYunikoAuth must be used inside AuthProvider');
  return context;
}
