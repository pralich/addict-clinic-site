import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "@/lib/crm-api";

export type CrmUser = { id: number; name: string; email: string; role: string };

type Ctx = {
  user: CrmUser | null;
  loading: boolean;
  signIn: (token: string, user: CrmUser) => void;
  signOut: () => void;
};

const AuthCtx = createContext<Ctx>({ user: null, loading: true, signIn: () => {}, signOut: () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: CrmUser }>({ resource: "auth", action: "me" })
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener("crm-logout", h);
    return () => window.removeEventListener("crm-logout", h);
  }, []);

  const signIn = useCallback((token: string, u: CrmUser) => {
    setToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    api({ resource: "auth", action: "logout" }, "POST").catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
