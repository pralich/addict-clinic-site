import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LOGO_URL, PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { FamilyAuthProvider, useFamilyAuth } from "@/components/family/FamilyAuth";
import FamilyLogin from "@/components/family/FamilyLogin";
import HomeSection from "@/components/family/HomeSection";
import QuestionsSection from "@/components/family/QuestionsSection";
import EventsSection from "@/components/family/EventsSection";
import AiSection from "@/components/family/AiSection";
import BillingSection from "@/components/family/BillingSection";
import TrialBanner from "@/components/family/TrialBanner";
import PushCard from "@/components/family/PushCard";
import FamilyInstall from "@/components/family/FamilyInstall";
import { RELATIONS, fmtNum } from "@/lib/family-api";
import { useSeo } from "@/lib/seo";

const NAV = [
  { id: "home", label: "Главная", icon: "House" },
  { id: "ai", label: "ИИ-психолог", icon: "Sparkles", badge: "NEW" },
  { id: "questions", label: "Вопрос психологу", icon: "MessageCircleQuestion" },
  { id: "events", label: "Встречи и вебинары", icon: "CalendarHeart" },
  { id: "billing", label: "Тарифы и баланс", icon: "Wallet" },
];

type BarItem = { label: string; icon: string; section?: string; to?: string };
const APP_BAR: BarItem[] = [
  { section: "ai", label: "ИИ-психолог", icon: "Sparkles" },
  { section: "questions", label: "Живой психолог", icon: "MessageCircleHeart" },
  { section: "events", label: "События", icon: "CalendarHeart" },
  { to: "/shop", label: "Магазин", icon: "ShoppingBag" },
  { to: "/", label: "Клиника", icon: "Hospital" },
];

const TITLES: Record<string, { title: string; text: string }> = {
  questions: { title: "Вопрос психологу", text: "Задайте вопрос — специалист клиники ответит письменно в течение 24 часов." },
  events: { title: "Встречи и вебинары", text: "Группы поддержки для родственников и онлайн-эфиры с врачами клиники." },
  billing: { title: "Тарифы и баланс", text: "Пополняйте баланс ИИ-токенов и подключайте персональную поддержку специалистов." },
};

const Shell = () => {
  const { user, stats, loading, signOut } = useFamilyAuth();
  const [params, setParams] = useSearchParams();
  const section = NAV.some((n) => n.id === params.get("s")) ? params.get("s")! : "home";
  const [menu, setMenu] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  if (!user) return <FamilyLogin />;

  const go = (s: string) => { setParams(s === "home" ? {} : { s }); setMenu(false); window.scrollTo(0, 0); };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/"><img src={LOGO_URL} alt="addict.clinic" className="h-5" /></Link>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="HeartHandshake" size={13} className="text-primary" />Кабинет для близких</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => go(n.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${section === n.id ? "bg-ink font-medium text-ink-foreground" : "text-foreground/75 hover:bg-secondary"}`}>
            <Icon name={n.icon} size={18} />
            {n.label}
            {n.badge && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{n.badge}</span>}
            {n.id === "questions" && !!stats?.answered && section !== n.id && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />}
            {n.id === "billing" && stats?.tokens !== undefined && <span className={`ml-auto text-xs ${section === n.id ? "text-white/60" : "text-muted-foreground"}`}>{fmtNum(stats.tokens)}</span>}
          </button>
        ))}
      </nav>
      <FamilyInstall />
      <PushCard compact />
      <div className="m-3 rounded-2xl bg-card p-4">
        <p className="text-xs text-muted-foreground">Срочная помощь 24/7</p>
        <a href={PHONE_HREF} className="mt-1 block font-heading font-semibold hover:text-primary">{PHONE_DISPLAY}</a>
      </div>
      <div className="flex items-center gap-3 border-t p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{user.name.slice(0, 1)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{RELATIONS[user.relation || "other"]}</p>
        </div>
        <button onClick={signOut} title="Выйти" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Icon name="LogOut" size={16} /></button>
      </div>
    </div>
  );

  const head = TITLES[section];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-[260px] border-r bg-background lg:block">{nav}</aside>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[280px] p-0">{nav}</SheetContent>
      </Sheet>
      <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 bg-ink px-4 py-2 text-ink-foreground">
          <Link to="/" className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
            <Icon name="ChevronLeft" size={16} className="shrink-0 opacity-70" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Icon name="Plus" size={14} /></span>
            <span className="truncate">Лечение зависимостей</span>
          </Link>
          <a href={PHONE_HREF} className="shrink-0 text-xs font-medium opacity-80">{PHONE_DISPLAY}</a>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setMenu(true)} aria-label="Меню"><Icon name="Menu" size={22} /></button>
          <span className="flex-1 font-heading font-semibold">{NAV.find((n) => n.id === section)?.label}</span>
          <FamilyInstall variant="icon" />
          <a href={PHONE_HREF} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Позвонить"><Icon name="Phone" size={16} /></a>
        </div>
      </header>
      <main className="px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:px-8 lg:ml-[260px] lg:py-8">
        <div className="mx-auto max-w-[1200px]">
          <TrialBanner go={go} />
          {head && (
            <div className="mb-6">
              <h1 className="font-heading text-[1.9em] font-semibold tracking-[-0.03em]">{head.title}</h1>
              <p className="mt-1 text-muted-foreground">{head.text}</p>
            </div>
          )}
          {section === "home" && <HomeSection go={go} />}
          {section === "questions" && <QuestionsSection />}
          {section === "events" && <EventsSection />}
          {section === "ai" && <AiSection />}
          {section === "billing" && <BillingSection />}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Быстрые разделы">
        <div className="grid h-16 grid-cols-5">
          {APP_BAR.map((b) => {
            const active = b.section === section;
            const inner = (
              <>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-primary text-primary-foreground" : ""}`}>
                  <Icon name={b.icon} size={19} />
                </span>
                <span className={`w-full truncate px-0.5 text-center text-[10.5px] leading-tight ${active ? "font-semibold text-foreground" : ""}`}>{b.label}</span>
                {b.section === "questions" && !!stats?.answered && !active && <span className="absolute right-[calc(50%-1.4rem)] top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />}
              </>
            );
            const cls = `relative flex min-w-0 flex-col items-center justify-center gap-1 text-muted-foreground active:opacity-70`;
            return b.to ? (
              <Link key={b.label} to={b.to} className={cls}>{inner}</Link>
            ) : (
              <button key={b.label} onClick={() => go(b.section!)} className={cls} aria-current={active ? "page" : undefined}>{inner}</button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

const Family = () => {
  useSeo({
    title: "Кабинет для родственников зависимых — addict.clinic",
    description: "Бесплатный личный кабинет для близких зависимых: вопросы психологу, группы поддержки и вебинары, ИИ-психолог для подготовки разговора о лечении.",
    path: "/family",
    image: "/og-family.jpg?v=1",
    noindex: true,
  });
  return (
    <FamilyAuthProvider>
      <Shell />
    </FamilyAuthProvider>
  );
};

export default Family;