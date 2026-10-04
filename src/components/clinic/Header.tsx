import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";
import { LOGO_URL, PHONE_DISPLAY, PHONE_HREF } from "./contacts";

type Item = { href: string; label: string; icon: string; hint?: string };
type Group = { label: string; items?: Item[]; href?: string };

const MENU: Group[] = [
  {
    label: "Лечение",
    items: [
      { href: "#problems", label: "С чем помогаем", icon: "Stethoscope", hint: "Алкоголь, наркотики, игромания" },
      { href: "#methods", label: "Методы лечения", icon: "Pill", hint: "Детокс, терапия, реабилитация" },
      { href: "#steps", label: "Как обратиться", icon: "Route", hint: "4 шага от звонка до лечения" },
      { href: "#support", label: "Психологи 24/7", icon: "PhoneCall", hint: "Поддержка днём и ночью" },
    ],
  },
  {
    label: "О клинике",
    items: [
      { href: "#doctors", label: "Врачи", icon: "UserRound", hint: "41 специалист" },
      { href: "#privacy", label: "Анонимность", icon: "ShieldCheck", hint: "Без учёта и записей" },
      { href: "#faq", label: "Вопросы и ответы", icon: "CircleHelp", hint: "Частые вопросы" },
    ],
  },
  { label: "Близким", href: "#cabinet" },
  { label: "Статьи", href: "/articles" },
  { label: "Магазин", href: "/shop" },
  { label: "Контакты", href: "#contacts" },
];

const SECTIONS = ["problems", "methods", "support", "cabinet", "privacy", "doctors", "steps", "faq", "articles", "contacts"];

const PremiumLink = ({ compact = false }: { compact?: boolean }) => (
  <Link
    to="/premium"
    className={`premium-btn inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full font-heading font-semibold transition-transform hover:-translate-y-0.5 ${compact ? "px-2.5 text-[0.72em] tracking-[0.12em]" : "px-3.5 text-[0.76em] tracking-[0.18em]"}`}
  >
    <Icon name="Crown" size={13} className="relative z-10 text-[#e6d3b3]" />
    <span className="premium-gold-text relative z-10">PREMIUM</span>
  </Link>
);

export const Logo = () => (
  <a href="/" className="block shrink-0" aria-label="addict.clinic — на главную">
    <img src={LOGO_URL} alt="addict.clinic" className="h-5 w-auto sm:h-6 md:h-[26px]" />
  </a>
);

const Header = () => {
  const { pathname } = useLocation();
  const href = (h: string) => (h.startsWith("#") && pathname !== "/" ? `/${h}` : h);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 24);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return setActive(pathname.startsWith("/articles") ? "articles" : pathname.startsWith("/shop") ? "shop" : "");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    const t = setTimeout(() => SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); }), 300);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [pathname]);

  const isActive = (g: Group) =>
    g.items ? g.items.some((i) => i.href === `#${active}`) : g.href === `#${active}` || (g.href === "/articles" && active === "articles") || (g.href === "/shop" && active === "shop");

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`hidden overflow-hidden bg-ink text-ink-foreground transition-all duration-300 xl:block ${scrolled ? "max-h-0" : "max-h-9"}`}
      >
        <div className="mx-auto flex h-9 max-w-[1280px] items-center justify-between px-14 text-[0.8em]">
          <div className="flex items-center gap-5 text-white/65">
            <span className="flex items-center gap-2 text-white/90">
              <i className="live-dot block h-1.5 w-1.5 rounded-full bg-live" />
              Психологи на линии — ответ за 30 секунд
            </span>
            <span className="flex items-center gap-1.5"><Icon name="ShieldCheck" size={13} />Анонимно, без учёта</span>
            <span className="flex items-center gap-1.5"><Icon name="Car" size={13} />Выезд врача за 1 час</span>
          </div>
          <div className="flex items-center gap-5 text-white/65">
            <a href={href("#contacts")} className="flex items-center gap-1.5 transition-colors hover:text-white"><Icon name="MessageCircle" size={13} />Написать анонимно</a>
            <Link to="/shop?category=certificates" className="flex items-center gap-1.5 transition-colors hover:text-white"><Icon name="Gift" size={13} />Подарочные сертификаты</Link>
            <Link to="/family" className="flex items-center gap-1.5 transition-colors hover:text-white"><Icon name="HeartHandshake" size={13} />Кабинет для близких</Link>
          </div>
        </div>
      </div>

      <div
        className={`relative border-b transition-all duration-300 ${
          scrolled ? "border-border bg-background/80 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur-xl" : "border-transparent bg-background"
        }`}
      >
        <div className={`mx-auto flex max-w-[1280px] items-center justify-between gap-4 pl-5 pr-4 transition-all duration-300 md:pl-14 md:pr-9 ${scrolled ? "h-[56px]" : "h-[64px]"}`}>
          <Logo />

          <nav className="hidden items-center gap-0.5 rounded-full bg-secondary/70 p-1 xl:flex">
            {MENU.map((g) =>
              g.items ? (
                <div key={g.label} className="group relative">
                  <button
                    className={`flex h-8 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-[0.9em] font-medium transition-colors ${
                      isActive(g) ? "bg-card text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {g.label}
                    <Icon name="ChevronDown" size={14} className="transition-transform duration-200 group-hover:rotate-180" />
                  </button>
                  <div className="invisible absolute left-1/2 top-full z-50 w-[340px] -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="rounded-2xl border bg-card p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
                      {g.items.map((i) => (
                        <a
                          key={i.href}
                          href={href(i.href)}
                          className={`group/item flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary ${i.href === `#${active}` ? "bg-secondary" : ""}`}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover/item:bg-primary group-hover/item:text-primary-foreground">
                            <Icon name={i.icon} size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[0.92em] font-medium">{i.label}</span>
                            <span className="block text-[0.8em] text-muted-foreground">{i.hint}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <a
                  key={g.label}
                  href={href(g.href!)}
                  className={`flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[0.9em] font-medium transition-colors ${
                    isActive(g) ? "bg-card text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {g.label}
                </a>
              )
            )}
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <PremiumLink />
            <Link
              to="/family"
              title="Кабинет для близких"
              aria-label="Кабинет для близких"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-colors hover:border-foreground/20"
            >
              <Icon name="UserRound" size={16} />
            </Link>
            <a
              href={PHONE_HREF}
              className="group inline-flex h-10 items-center gap-2.5 whitespace-nowrap rounded-full bg-primary pl-1.5 pr-4 font-medium text-primary-foreground accent-glow transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Icon name="Phone" size={14} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[0.92em] tracking-tight">{PHONE_DISPLAY}</span>
                <span className="mt-0.5 text-[0.66em] font-normal text-primary-foreground/80">бесплатно, 24/7</span>
              </span>
            </a>
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <PremiumLink compact />
            <a href={PHONE_HREF} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground accent-glow" aria-label="Позвонить">
              <Icon name="Phone" size={16} />
            </a>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary" aria-label="Меню">
                  <Icon name="Menu" size={18} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full flex-col overflow-y-auto bg-background p-0 sm:max-w-[420px]">
                <div className="flex items-center gap-2 border-b px-5 py-4">
                  <SheetTitle className="sr-only">Меню</SheetTitle>
                  <img src={LOGO_URL} alt="addict.clinic" className="h-5 w-auto" />
                </div>

                <div className="mx-5 mt-5 flex items-center gap-2 rounded-xl bg-live/10 px-3 py-2.5 text-sm">
                  <i className="live-dot block h-2 w-2 shrink-0 rounded-full bg-live" />
                  Психологи на линии — ответ за 30 секунд
                </div>

                <div className="flex-1 px-5 py-5">
                  {MENU.filter((g) => g.items).map((g) => (
                    <div key={g.label} className="mb-5">
                      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{g.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.items!.map((i) => (
                          <a
                            key={i.href}
                            href={href(i.href)}
                            onClick={() => setOpen(false)}
                            className={`flex flex-col gap-3 rounded-xl border bg-card p-3 transition-colors active:bg-secondary ${i.href === `#${active}` ? "border-primary/40" : ""}`}
                          >
                            <Icon name={i.icon} size={18} className="text-primary" />
                            <span className="text-[0.92em] font-medium leading-tight">{i.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col">
                    {MENU.filter((g) => !g.items).map((g) => (
                      <a
                        key={g.label}
                        href={href(g.href!)}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between border-b py-3.5 font-heading text-lg font-medium tracking-tight last:border-0"
                      >
                        {g.label}
                        <Icon name="ArrowUpRight" size={18} className="text-muted-foreground" />
                      </a>
                    ))}
                  </div>

                  <Link
                    to="/family"
                    onClick={() => setOpen(false)}
                    className="mt-5 flex items-center gap-3 rounded-xl bg-ink px-4 py-3.5 text-ink-foreground"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10"><Icon name="HeartHandshake" size={20} /></span>
                    <span className="flex-1">
                      <span className="block font-medium">Кабинет для близких</span>
                      <span className="block text-xs text-white/60">3 дня бесплатно · психолог, ИИ, встречи</span>
                    </span>
                    <Icon name="ArrowRight" size={16} />
                  </Link>
                </div>

                <div className="sticky bottom-0 border-t bg-background/95 p-5 backdrop-blur">
                  <div className="grid grid-cols-2 gap-2">
                    <a href={PHONE_HREF} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground accent-glow">
                      <Icon name="Phone" size={16} />
                      Позвонить
                    </a>
                    <a href={href("#contacts")} onClick={() => setOpen(false)} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary font-medium">
                      <Icon name="MessageCircle" size={16} />
                      Написать
                    </a>
                  </div>
                  <p className="mt-2.5 text-center text-xs text-muted-foreground">{PHONE_DISPLAY} · бесплатно, анонимно, 24/7</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-primary transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </header>
  );
};

export default Header;
