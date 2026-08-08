"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { api, sessionSnapshot, subscribeSession } from "./api";
import type { AuthUser, Session } from "./types";

interface AuthState {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Server snapshot is null: pages render signed-out on the server, then the
  // stored session lands during hydration — before any effect runs.
  const raw = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null);

  const user = useMemo(() => {
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as Session).user;
    } catch {
      return null;
    }
  }, [raw]);

  const login = useCallback(async (email: string, password: string) => {
    await api.auth.login(email, password);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
