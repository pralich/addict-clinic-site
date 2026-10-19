import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import ShopProductsPage from "@/components/admin/ShopProductsPage";
import SeoPage from "@/components/admin/SeoPage";
import ApiPage from "@/components/admin/ApiPage";
import CallsPage from "@/components/admin/CallsPage";
import CallerPopup from "@/components/admin/CallerPopup";
import RequestLogsPage from "@/components/admin/RequestLogsPage";
import InTreatmentPage from "@/components/admin/InTreatmentPage";
import FinancePage from "@/components/admin/finance/FinancePage";
import TasksPage from "@/components/admin/tasks/TasksPage";
import BroadcastPage from "@/components/admin/broadcast/BroadcastPage";
import { ROLES } from "@/components/admin/config";
import { api } from "@/lib/crm-api";
import { pingCrmNotify } from "@/lib/crm-push";
import { useCallAiQueue } from "@/lib/call-ai";
import { pingBroadcastTick } from "@/lib/broadcast-api";
import { useSeo } from "@/lib/seo";

type NavItem = { id: string; label: string; icon: string; admin?: boolean; staff?: boolean };

const LEADS_ONLY_PAGES = ["leads", "tasks"];

const APP_BAR = [
  { id: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { id: "calls", label: "Звонки", icon: "PhoneCall" },
  { id: "leads", label: "Лиды", icon: "Inbox" },
  { id: "deals", label: "Сделки", icon: "Handshake" },
  { id: "in-treatment", label: "Лечатся", icon: "BedDouble" },
];

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "CRM",
    items: [
      { id: "dashboard", label: "Сводка", icon: "LayoutDashboard" },
      { id: "tasks", label: "Задачи", icon: "ListTodo" },
      { id: "leads", label: "Лиды", icon: "Inbox" },
      { id: "calls", label: "Звонки", icon: "PhoneCall" },
      { id: "deals", label: "Сделки", icon: "Handshake" },
      { id: "clients", label: "Клиенты", icon: "Users" },
      { id: "in-treatment", label: "Сейчас лечатся", icon: "BedDouble" },
      { id: "partners", label: "Партнёры", icon: "Building2" },
      { id: "broadcasts", label: "Push-рассылки", icon: "Megaphone", staff: true },
      { id: "finance", label: "Финансы", icon: "Wallet", admin: true },
      { id: "users", label: "Пользователи", icon: "UserCog" },
      { id: "api", label: "API", icon: "Webhook" },
      { id: "request-logs", label: "Журнал запросов", icon: "ScrollText", admin: true },
    ],
  },
  {
    title: "Кабинет близких",
    items: [
      { id: "family", label: "Вопросы", icon: "MessageCircleQuestion" },
      { id: "family-events", label: "События", icon: "CalendarHeart" },
      { id: "family-users", label: "Родственники", icon: "HeartHandshake" },
    ],
  },
  {
    title: "Сайт",
    items: [
      { id: "articles", label: "Статьи", icon: "Newspaper" },
      { id: "products", label: "Товары магазина", icon: "Package", staff: true },
      { id: "orders", label: "Заказы магазина", icon: "ShoppingBag" },
      { id: "seo", label: "SEO", icon: "SearchCheck" },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((g) => g.items);
const FAMILY_SECTION: Record<string, string> = { family: "questions", "family-events": "events", "family-users": "users" };

const Shell = () => {
  const { user, loading, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = params.get("page");
  const [page, setPage] = useState(initial && NAV.some((n) => n.id === initial) ? initial : "dashboard");
  const limited = user?.role === "leads_only";
  const allowed = (id: string) => !limited || LEADS_ONLY_PAGES.includes(id);

  const [drawer, setDrawer] = useState<{ resource: string; id: number } | null>(() => {
    const m = /^(leads|deals|clients|partners):(\d+)$/.exec(params.get("open") || "");
    return m ? { resource: m[1], id: Number(m[2]) } : null;
  });
  const [menu, setMenu] = useState(false);
  const [openTask, setOpenTask] = useState<number | null>(() => Number(params.get("task")) || null);
  const qc = useQueryClient();
  useCallAiQueue(!!user && !limited);

  useEffect(() => {
    if (params.has("page") || params.has("source") || params.has("open") || params.has("task")) setParams({}, { replace: true });
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
        if (m && (!limited || m[1] === "leads")) setDrawer({ resource: m[1], id: Number(m[2]) });
        if (Number(u.searchParams.get("task"))) setOpenTask(Number(u.searchParams.get("task")));
        qc.invalidateQueries({ queryKey: ["crm"] });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [qc]);

  const { data: counters } = useQuery<{ leads: number; questions: number; tasks: number }>({
    queryKey: ["crm", "counters"],
    queryFn: () => { pingCrmNotify(); pingBroadcastTick(); return api({ resource: "counters" }); },
    enabled: !!user,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const badges: Record<string, number> = { leads: counters?.leads ?? 0, family: counters?.questions ?? 0, tasks: counters?.tasks ?? 0 };
  const badgeTotal = badges.leads + badges.family + badges.tasks;

  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!counters) return;
    if (badgeTotal > 0) nav.setAppBadge?.(badgeTotal).catch(() => null);
    else nav.clearAppBadge?.().catch(() => null);
  }, [counters, badgeTotal]);

  useEffect(() => {
    if (limited && !LEADS_ONLY_PAGES.includes(page)) setPage("leads");
    if (limited && drawer && drawer.resource !== "leads") setDrawer(null);
  }, [limited, page, drawer]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <LoginScreen />;

  const open = (resource: string, id: number) => {
    if (limited && resource !== "leads") return toast.error("У вас доступ только к лидам");
    setDrawer({ resource, id });
  };
  const clearTask = () => setOpenTask(null);
  const go = (p: string) => { setPage(p); setMenu(false); window.scrollTo({ top: 0 }); };
  const appBar = APP_BAR.filter((n) => allowed(n.id));


  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <img src="/admin-192.png" alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <p className="font-heading font-semibold leading-tight">addict.clinic</p>
          <p className="text-[11px] text-night-muted">CRM</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.filter((g) => g.items.some((n) => allowed(n.id))).map((g) => (
          <div key={g.title} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-night-muted/70">{g.title}</p>
            {g.items.filter((n) => (!n.admin || user.role === "admin") && (!n.staff || ["admin", "manager"].includes(user.role)) && allowed(n.id)).map((n) => (
              <button key={n.id} onClick={() => go(n.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${page === n.id ? "bg-white/10 font-medium text-white" : "text-night-muted hover:bg-white/5 hover:text-white"}`}>
                <Icon name={n.icon} size={17} />
                {n.label}
                {badges[n.id] > 0 ? (
                  <span className="ml-auto min-w-[20px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-primary-foreground tabular-nums">
                    {badges[n.id] > 99 ? "99+" : badges[n.id]}
                  </span>
                ) : (
                  page === n.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
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
    <div className="crm-shell min-h-screen w-full max-w-[100vw] overflow-x-clip bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] bg-night text-night-foreground lg:block">{nav}</aside>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[260px] border-none bg-night p-0 text-night-foreground">{nav}</SheetContent>
      </Sheet>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <button onClick={() => setMenu(true)} className="relative" aria-label="Меню">
          <Icon name="Menu" size={22} />
          {badgeTotal > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />}
        </button>
        <span className="flex-1 font-heading font-semibold">{FAMILY_SECTION[page] ? `Близкие · ${NAV.find((n) => n.id === page)?.label}` : NAV.find((n) => n.id === page)?.label}</span>
        <PushSettings variant="icon" />
      </header>
      <main className={`min-w-0 px-4 py-6 [overflow-wrap:anywhere] md:px-8 md:py-8 lg:ml-[240px] lg:pb-8 2xl:px-10 ${appBar.length > 1 ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : ""}`}>
        <div className="mx-auto w-full min-w-0 max-w-[1760px]">
          {allowed(page) && <>
          {page === "dashboard" && <Dashboard onOpen={open} onNavigate={go} />}
          {["leads", "deals", "clients", "partners"].includes(page) && <EntityPage key={page} resource={page} onOpen={open} />}
          {page === "users" && <UsersPage />}
          {page === "articles" && <ArticlesPage />}
          {FAMILY_SECTION[page] && <FamilyAdminPage section={FAMILY_SECTION[page]} />}
          {page === "orders" && <ShopOrdersPage />}
          {page === "products" && ["admin", "manager"].includes(user.role) && <ShopProductsPage />}
          {page === "seo" && <SeoPage />}
          {page === "api" && <ApiPage />}
          {page === "calls" && <CallsPage onOpen={open} />}
          {page === "request-logs" && user.role === "admin" && <RequestLogsPage />}
          {page === "in-treatment" && <InTreatmentPage onOpen={open} />}
          {page === "finance" && <FinancePage onOpen={open} />}
          {page === "broadcasts" && ["admin", "manager"].includes(user.role) && <BroadcastPage />}
          {page === "tasks" && <TasksPage onOpen={open} openTask={openTask} onTaskOpened={clearTask} />}
          </>}
        </div>
      </main>
      {appBar.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg">
            {appBar.map((n) => {
              const active = page === n.id;
              return (
                <button key={n.id} onClick={() => go(n.id)} className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] transition-colors ${active ? "font-medium text-primary" : "text-muted-foreground"}`}>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-primary/10" : ""}`}><Icon name={n.icon} size={20} /></span>
                  <span className="max-w-full truncate">{n.label}</span>
                  {badges[n.id] > 0 && (
                    <span className="absolute left-1/2 top-1 ml-2 min-w-[18px] rounded-full bg-primary px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
                      {badges[n.id] > 99 ? "99+" : badges[n.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
      <CallerPopup onOpen={open} />
      {drawer && (!limited || drawer.resource === "leads") && <EntityDrawer key={drawer.resource} resource={drawer.resource} id={drawer.id} onClose={() => setDrawer(null)} onOpen={open} />}
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
