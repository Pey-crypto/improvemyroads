"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

type User = { id: string; email: string; name: string; role: string };
type AuthResult = { user: User; token: string; expiresAt: string | Date };
type RegisterData = { email: string; password: string; name: string; phone: string };

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  const persistToken = useCallback((value: string | null) => {
    if (typeof window === 'undefined') return;
    if (value) localStorage.setItem('token', value);
    else localStorage.removeItem('token');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<User>('/api/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResult>('/api/auth/login', { email, password });
      const t = res.token;
      setToken(t);
      persistToken(t);
      await refreshUser();
      toast.success('Welcome back');
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Login failed');
      toast.error(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [persistToken, refreshUser]);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResult>('/api/auth/register', data);
      const t = res.token;
      setToken(t);
      persistToken(t);
      await refreshUser();
      toast.success('Account created');
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Registration failed');
      toast.error(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [persistToken, refreshUser]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    persistToken(null);
  }, [persistToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token');
    if (t) {
      setToken(t);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token, refreshUser]);

  const value: AuthContextType = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  }), [user, token, isLoading, isAuthenticated, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
