import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';
import type { User, Theme } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  theme: Theme;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  setTheme: (t: Theme) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

const THEME_KEY = 'mt:theme';

function readLocalTheme(): Theme {
  const t = localStorage.getItem(THEME_KEY);
  return t === 'LIGHT' ? 'LIGHT' : 'DARK';
}
function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t === 'LIGHT' ? 'light' : 'dark');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<Theme>(readLocalTheme());

  // Apply theme on load + any change
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      const token = tokenStore.get();
      if (!token) { setLoading(false); return; }
      try {
        const { user } = await api<{ user: User }>('/auth/me');
        setUser(user);
        if (user.theme) setThemeState(user.theme);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await api<{ user: User; token: string }>('/auth/login', {
      method: 'POST', body: { email, password },
    });
    tokenStore.set(token);
    setUser(user);
    if (user.theme) setThemeState(user.theme);
  };

  const register = async (email: string, name: string, password: string) => {
    const { user, token } = await api<{ user: User; token: string }>('/auth/register', {
      method: 'POST', body: { email, name, password },
    });
    tokenStore.set(token);
    setUser(user);
    if (user.theme) setThemeState(user.theme);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    if (user) {
      try {
        await api('/users/me/theme', { method: 'PATCH', body: { theme: t } });
      } catch {
        // silently ignore — local state still works
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, theme, login, register, logout, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
