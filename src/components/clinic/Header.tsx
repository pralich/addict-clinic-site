import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LOGO_URL, NAV, PHONE_DISPLAY, PHONE_HREF } from "./contacts";

export const Logo = () => (
  <a href="#top" className="relative block h-7 w-[204px] overflow-hidden shrink-0" aria-label="addict.clinic">
    <img
      src={LOGO_URL}
      alt="addict.clinic"
      className="absolute max-w-none"
      style={{ width: 224, height: 224, left: -10, top: -98 }}
    />
  </a>
);

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border transition-colors duration-300 ${
        scrolled ? "bg-background/85 backdrop-blur-md" : "bg-background"
      }`}
    >
      <div className="mx-auto flex h-[52px] max-w-[1280px] items-center justify-between pl-5 pr-4 md:pl-14 md:pr-9">
        <Logo />
        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="story-link text-[0.94em] text-muted-foreground hover:text-foreground transition-colors">
              {n.label}
            </a>
          ))}
          <a
            href={PHONE_HREF}
            className="ml-1 inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-[17px] text-[0.94em] font-medium tracking-tight text-ink-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="Phone" size={14} />
            {PHONE_DISPLAY}
          </a>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={PHONE_HREF}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground accent-glow"
            aria-label="Позвонить"
          >
            <Icon name="Phone" size={16} />
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary" aria-label="Меню">
                <Icon name="Menu" size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background">
              <SheetTitle className="font-heading text-lg">Меню</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1">
                {NAV.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 font-heading text-xl font-medium tracking-tight hover:bg-secondary"
                  >
                    {n.label}
                  </a>
                ))}
              </nav>
              <a
                href={PHONE_HREF}
                className="mt-8 flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground accent-glow"
              >
                <Icon name="Phone" size={16} />
                Срочная помощь 24/7
              </a>
              <p className="mt-3 text-center text-sm text-muted-foreground">{PHONE_DISPLAY} · бесплатно</p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
