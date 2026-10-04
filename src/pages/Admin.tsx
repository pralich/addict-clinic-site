import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AuthProvider, useAuth } from "@/components/admin/AuthContext";
import LoginScreen from "@/components/admin/LoginScreen";
import Dashboard from "@/components/admin/Dashboard";
import EntityPage from "@/components/admin/EntityPage";
import UsersPage from "@/components/admin/UsersPage";
import ArticlesPage from "@/components/admin/ArticlesPage";
import FamilyAdminPage from "@/components/admin/FamilyAdminPage";
import EntityDrawer from "@/components/admin/EntityDrawer";
import AdminInstall from "@/components/admin/AdminInstall";
import PushSettings from "@/components/admin/PushSettings";
import ShopOrdersPage from "@/components/admin/ShopOrdersPage";
import { ROLES } from "@/components/admin/config";
import { useSeo } from "@/lib/seo";

const NAV = [
  { id: "dashboard", label: "Сводка", icon: "LayoutDashboard" },
  { id: "leads", label: "Лиды", icon: "Inbox" },
  { id: "deals", label: "Сделки", icon: "Handshake" },
  { id: "clients", label: "Клиенты", icon: "Users" },
  { id: "partners", label: "Партнёры", icon: "Building2" },
  { id: "orders", label: "Заказы магазина", icon: "ShoppingBag" },
  { id: "family", label: "Кабинет близких", icon: "HeartHandshake" },
  { id: "articles", label: "Статьи", icon: "Newspaper" },
  { id: "users", label: "Пользователи", icon: "UserCog" },
];

const Shell = () => {
  const { user, loading, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = params.get("page");
  const [page, setPage] = useState(initial && NAV.some((n) => n.id === initial) ? initial : "dashboard");

  const [drawer, setDrawer] = useState<{ resource: string; id: number } | null>(() => {
    const m = /^(leads|deals|clients|partners):(\d+)$/.exec(params.get("open") || "");
    return m ? { resource: m[1], id: Number(m[2]) } : null;
  });
  const [menu, setMenu] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (params.has("page") || params.has("source") || params.has("open")) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.type === "crm-push") {
        qc.invalidateQueries({ queryKey: ["crm"] });
        if (document.visibilityState === "visible" && d.payload?.title && d.payload?.tag !== "crm-test") toast(d.payload.title, { description: d.payload.body });
      }
      if (d.type === "crm-open" && d.url) {
        const u = new URL(d.url);
        const p = u.searchParams.get("page");
        if (p && NAV.some((n) => n.id === p)) setPage(p);
        const m = /^(leads|deals|clients|partners):(\d+)$/.exec(u.searchParams.get("open") || "");
        if (m) setDrawer({ resource: m[1], id: Number(m[2]) });
        qc.invalidateQueries({ queryKey: ["crm"] });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    const onFocus = () => (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => null);
    onFocus();
    window.addEventListener("focus", onFocus);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMsg);
      window.removeEventListener("focus", onFocus);
    };
  }, [qc]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <LoginScreen />;

  const open = (resource: string, id: number) => setDrawer({ resource, id });
  const go = (p: string) => { setPage(p); setMenu(false); };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <img src="/admin-192.png" alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <p className="font-heading font-semibold leading-tight">addict.clinic</p>
          <p className="text-[11px] text-night-muted">CRM</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => go(n.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${page === n.id ? "bg-white/10 font-medium text-white" : "text-night-muted hover:bg-white/5 hover:text-white"}`}>
            <Icon name={n.icon} size={18} />
            {n.label}
            {page === n.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2"><AdminInstall /></div>
        <PushSettings />
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-night-muted hover:text-white">
          <Icon name="Globe" size={16} />На сайт
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">{user.name}</p>
            <p className="text-[11px] text-night-muted">{ROLES[user.role]}</p>
          </div>
          <button onClick={signOut} title="Выйти" className="text-night-muted hover:text-white"><Icon name="LogOut" size={16} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] bg-night text-night-foreground lg:block">{nav}</aside>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[260px] border-none bg-night p-0 text-night-foreground">{nav}</SheetContent>
      </Sheet>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <button onClick={() => setMenu(true)}><Icon name="Menu" size={22} /></button>
        <span className="flex-1 font-heading font-semibold">{NAV.find((n) => n.id === page)?.label}</span>
        <PushSettings variant="icon" />
      </header>
      <main className="px-4 py-6 md:px-8 md:py-8 lg:ml-[240px]">
        <div className="mx-auto max-w-[1400px]">
          {page === "dashboard" && <Dashboard onOpen={open} onNavigate={go} />}
          {["leads", "deals", "clients", "partners"].includes(page) && <EntityPage key={page} resource={page} onOpen={open} />}
          {page === "users" && <UsersPage />}
          {page === "articles" && <ArticlesPage />}
          {page === "family" && <FamilyAdminPage />}
          {page === "orders" && <ShopOrdersPage />}
        </div>
      </main>
      {drawer && <EntityDrawer key={`${drawer.resource}-${drawer.id}`} resource={drawer.resource} id={drawer.id} onClose={() => setDrawer(null)} onOpen={open} />}
    </div>
  );
};

const Admin = () => {
  useSeo({ title: "CRM — addict.clinic", description: "Панель управления", path: "/admin", noindex: true });
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
};

export default Admin;
