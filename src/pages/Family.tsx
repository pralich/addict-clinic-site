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
import { RELATIONS, fmtNum } from "@/lib/family-api";
import { useSeo } from "@/lib/seo";

const NAV = [
  { id: "home", label: "Главная", icon: "House" },
  { id: "ai", label: "ИИ-психолог", icon: "Sparkles", badge: "NEW" },
  { id: "questions", label: "Вопрос психологу", icon: "MessageCircleQuestion" },
  { id: "events", label: "Встречи и вебинары", icon: "CalendarHeart" },
  { id: "billing", label: "Тарифы и баланс", icon: "Wallet" },
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
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setMenu(true)} aria-label="Меню"><Icon name="Menu" size={22} /></button>
        <span className="flex-1 font-heading font-semibold">{NAV.find((n) => n.id === section)?.label}</span>
        <a href={PHONE_HREF} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Позвонить"><Icon name="Phone" size={16} /></a>
      </header>
      <main className="px-4 py-6 md:px-8 lg:ml-[260px] lg:py-8">
        <div className="mx-auto max-w-[1200px]">
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
    </div>
  );
};

const Family = () => {
  useSeo({
    title: "Кабинет для родственников зависимых — addict.clinic",
    description: "Бесплатный личный кабинет для близких зависимых: вопросы психологу, группы поддержки и вебинары, ИИ-психолог для подготовки разговора о лечении.",
    path: "/family",
    noindex: true,
  });
  return (
    <FamilyAuthProvider>
      <Shell />
    </FamilyAuthProvider>
  );
};

export default Family;
