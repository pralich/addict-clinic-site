import { useState } from "react";
import { Link } from "react-router-dom";
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
import { ROLES } from "@/components/admin/config";
import { useSeo } from "@/lib/seo";

const NAV = [
  { id: "dashboard", label: "Сводка", icon: "LayoutDashboard" },
  { id: "leads", label: "Лиды", icon: "Inbox" },
  { id: "deals", label: "Сделки", icon: "Handshake" },
  { id: "clients", label: "Клиенты", icon: "Users" },
  { id: "partners", label: "Партнёры", icon: "Building2" },
  { id: "family", label: "Кабинет близких", icon: "HeartHandshake" },
  { id: "articles", label: "Статьи", icon: "Newspaper" },
  { id: "users", label: "Пользователи", icon: "UserCog" },
];

const Shell = () => {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [drawer, setDrawer] = useState<{ resource: string; id: number } | null>(null);
  const [menu, setMenu] = useState(false);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <LoginScreen />;

  const open = (resource: string, id: number) => setDrawer({ resource, id });
  const go = (p: string) => { setPage(p); setMenu(false); };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon name="Cross" size={18} /></div>
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
      <div className="border-t border-white/10 p-3">
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
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setMenu(true)}><Icon name="Menu" size={22} /></button>
        <span className="font-heading font-semibold">{NAV.find((n) => n.id === page)?.label}</span>
      </header>
      <main className="px-4 py-6 md:px-8 md:py-8 lg:ml-[240px]">
        <div className="mx-auto max-w-[1400px]">
          {page === "dashboard" && <Dashboard onOpen={open} onNavigate={go} />}
          {["leads", "deals", "clients", "partners"].includes(page) && <EntityPage key={page} resource={page} onOpen={open} />}
          {page === "users" && <UsersPage />}
          {page === "articles" && <ArticlesPage />}
          {page === "family" && <FamilyAdminPage />}
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
