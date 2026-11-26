"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, logout as apiLogout } from "@/lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  emailVerifiedAt?: string | null;
  profile?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    onboardingStatus?: "NOT_STARTED" | "IN_PROGRESS" | "SKIPPED" | "COMPLETED";
    onboardingStep?: number;
  } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshAuth: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await apiFetch("/auth/me", { method: "GET" });
      if (!response.ok) {
        setUser(null);
        return null;
      }
      const data = await response.json() as { user?: AuthUser };
      if (!data.user?.id || !data.user.email) {
        setUser(null);
        return null;
      }
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const response = await apiLogout();
    if (!response.ok) throw new Error("Unable to sign out. Please try again.");
    setUser(null);
  }, []);

  useEffect(() => { void refreshAuth(); }, [refreshAuth]);

  const value = useMemo(() => ({ user, loading, refreshAuth, signOut }), [user, loading, refreshAuth, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
