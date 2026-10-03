import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { LOGO_URL, NAV, PHONE_DISPLAY, PHONE_HREF } from "./contacts";

const PremiumLink = ({ compact = false }: { compact?: boolean }) => (
  <Link
    to="/premium"
    className={`premium-btn inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full font-heading font-semibold transition-transform hover:-translate-y-0.5 ${compact ? "px-2.5 text-[0.72em] tracking-[0.12em]" : "px-4 text-[0.82em] tracking-[0.18em]"}`}
  >
    <Icon name="Crown" size={13} className="relative z-10 text-[#e6d3b3]" />
    <span className="premium-gold-text relative z-10">PREMIUM</span>
  </Link>
);

export const Logo = () => (
  <a href="#top" className="block shrink-0" aria-label="addict.clinic">
    <img src={LOGO_URL} alt="addict.clinic" className="h-5 w-auto sm:h-6 md:h-7" />
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
          <PremiumLink />
          <a
            href={PHONE_HREF}
            className="ml-1 inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-[17px] text-[0.94em] font-medium tracking-tight text-ink-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="Phone" size={14} />
            {PHONE_DISPLAY}
          </a>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <PremiumLink compact />
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
              <Link
                to="/premium"
                onClick={() => setOpen(false)}
                className="premium-btn mt-6 flex h-12 items-center justify-center gap-2 rounded-full font-heading font-semibold tracking-[0.2em]"
              >
                <Icon name="Crown" size={16} className="relative z-10 text-[#e6d3b3]" />
                <span className="premium-gold-text relative z-10">PREMIUM</span>
              </Link>
              <a
                href={PHONE_HREF}
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground accent-glow"
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