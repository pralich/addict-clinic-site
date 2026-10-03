import Icon from "@/components/ui/icon";
import { Logo } from "./Header";
import { NAV, PHONE_DISPLAY, PHONE_HREF } from "./contacts";

const Footer = () => (
  <footer className="border-t border-border bg-background">
    <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-16">
      <div>
        <Logo />
        <p className="mt-4 max-w-[320px] text-[0.92em] leading-relaxed text-muted-foreground">
          Медицинский центр лечения зависимостей. Анонимно, без постановки на учёт, круглосуточно.
        </p>
      </div>
      <nav className="grid grid-cols-2 gap-2 text-[0.95em]">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className="w-fit text-muted-foreground hover:text-foreground story-link">
            {n.label}
          </a>
        ))}
      </nav>
      <div>
        <a href={PHONE_HREF} className="font-heading text-[1.5em] font-medium tracking-[-0.03em] hover:text-primary transition-colors">
          {PHONE_DISPLAY}
        </a>
        <p className="mt-1 text-[0.9em] text-muted-foreground">Бесплатно, 24/7</p>
        <p className="mt-4 flex items-center gap-2 text-[0.85em] text-muted-foreground">
          <Icon name="ShieldCheck" size={14} className="text-primary" />
          Лицензия на медицинскую деятельность
        </p>
      </div>
    </div>
    <div className="border-t border-border">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-5 text-[0.8em] text-muted-foreground md:flex-row md:justify-between md:px-16">
        <span>© {new Date().getFullYear()} addict.clinic</span>
        <span>Имеются противопоказания. Необходима консультация специалиста.</span>
      </div>
    </div>
  </footer>
);

export default Footer;
