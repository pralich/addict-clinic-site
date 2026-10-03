import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { familyApi, getFamilyToken, setFamilyToken, type FamilyStats, type FamilyUser } from "@/lib/family-api";

type Ctx = {
  user: FamilyUser | null;
  stats: FamilyStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const FamilyAuthContext = createContext<Ctx | null>(null);

export const FamilyAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getFamilyToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await familyApi.me();
      setUser(r.user);
      setStats(r.stats);
    } catch {
      setFamilyToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onLogout = () => setUser(null);
    window.addEventListener("family-logout", onLogout);
    return () => window.removeEventListener("family-logout", onLogout);
  }, [refresh]);

  const signIn = async (token: string) => {
    setFamilyToken(token);
    setLoading(true);
    await refresh();
  };

  const signOut = async () => {
    await familyApi.logout().catch(() => null);
    setFamilyToken(null);
    setUser(null);
  };

  return <FamilyAuthContext.Provider value={{ user, stats, loading, refresh, signIn, signOut }}>{children}</FamilyAuthContext.Provider>;
};

export const useFamilyAuth = () => {
  const ctx = useContext(FamilyAuthContext);
  if (!ctx) throw new Error("useFamilyAuth outside provider");
  return ctx;
};
