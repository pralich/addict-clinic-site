import { SERVICES } from "@/lib/services";
import { TREATMENTS } from "@/lib/treatments";
import Icon from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Logo } from "./Header";
import { NAV, PHONE_DISPLAY, PHONE_HREF } from "./contacts";
import { LEGAL_LINKS, MED_LICENSE, ORG } from "@/lib/legal";
import { openCookieSettings } from "@/lib/cookie-consent";

const Footer = () => (
  <footer className="border-t border-border bg-background">
    <div className="mx-auto grid max-w-site gap-8 px-5 py-12 md:grid-cols-2 md:px-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
      <div>
        <Logo />
        <p className="mt-4 max-w-[320px] text-[0.92em] leading-relaxed text-muted-foreground">
          Медицинский центр лечения зависимостей. Анонимно, без постановки на
          учёт, круглосуточно.
        </p>
      </div>
      <nav className="flex flex-col gap-2 text-[0.95em]">
        <a href="/lechenie" className="w-fit font-medium hover:text-primary">Лечение</a>
        {TREATMENTS.map((t) => (
          <a key={t.slug} href={t.path} className="w-fit text-muted-foreground hover:text-foreground story-link">{t.menu}</a>
        ))}
      </nav>
      <nav className="flex flex-col gap-2 text-[0.95em]">
        <a href="/uslugi" className="w-fit font-medium hover:text-primary">Услуги и цены</a>
        {SERVICES.map((s) => (
          <a key={s.slug} href={s.path} className="w-fit text-muted-foreground hover:text-foreground story-link">{s.menu}</a>
        ))}
      </nav>
      <nav className="grid grid-cols-2 content-start gap-2 text-[0.95em]">
        {NAV.map((n) => (
          <a
            key={n.href}
            href={n.href.startsWith("#") ? `/${n.href}` : n.href}
            className="w-fit text-muted-foreground hover:text-foreground story-link"
          >
            {n.label}
          </a>
        ))}
        <a
          href="/family"
          className="w-fit text-muted-foreground hover:text-foreground story-link"
        >
          Кабинет для близких
        </a>
      </nav>
      <div>
        <a
          href={PHONE_HREF}
          className="font-heading text-[1.5em] font-medium tracking-[-0.03em] hover:text-primary transition-colors"
        >
          {PHONE_DISPLAY}
        </a>
        <p className="mt-1 text-[0.9em] text-muted-foreground">
          Бесплатно, 24/7
        </p>
        <a
          href="#med-license"
          className="mt-4 flex w-fit items-center gap-2 text-[0.85em] text-muted-foreground hover:text-foreground"
        >
          <Icon name="ShieldCheck" size={14} className="text-primary" />
          Лицензия № {MED_LICENSE.number}
        </a>
      </div>
    </div>
    <div className="border-t border-border">
      <div className="mx-auto flex max-w-site flex-col gap-5 px-5 py-6 text-[0.8em] text-muted-foreground md:px-16">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </a>
          ))}
          <button
            onClick={openCookieSettings}
            className="hover:text-foreground"
          >
            Настройки cookie
          </button>
        </nav>
        <div
          id="med-license"
          className="scroll-mt-20 rounded-xl bg-card px-4 py-4 leading-snug md:px-5"
        >
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Icon name="ShieldCheck" size={14} className="text-primary" />
            Лицензия на осуществление медицинской деятельности
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Регистрационный номер", MED_LICENSE.number, ""],
              ["Дата предоставления", MED_LICENSE.date, ""],
              ["ОГРН", MED_LICENSE.ogrn, ""],
              ["ОПФ", MED_LICENSE.opf, ""],
              ["Полное наименование", MED_LICENSE.fullName, ""],
              ["Сокращённое наименование", MED_LICENSE.shortName, ""],
              ["Адрес места нахождения", MED_LICENSE.address, "sm:col-span-2"],
            ].map(([k, v, span]) => (
              <div key={k} className={span}>
                <dt className="text-[0.92em]">{k}</dt>
                <dd className="mt-0.5 text-foreground/85">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="leading-relaxed">
          Оператор сайта и персональных данных: {ORG.fullName}, ИНН {ORG.inn},
          ОГРН {ORG.ogrn}. {ORG.legalAddress}.{" "}
          <a href={`mailto:${ORG.email}`} className="hover:text-foreground">
            {ORG.email}
          </a>
          . Медицинские услуги оказывают лицензированные медицинские
          организации-партнёры.
        </p>
        <div className="flex flex-col gap-3 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} addict.clinic</span>
          <span className="md:text-center">
            Имеются противопоказания. Необходима консультация специалиста.
          </span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://alexpralich.ru"
                  target="_blank"
                  rel="noopener"
                  aria-label="DEV & ADS – ALEXPRALICH.RU"
                  className="w-fit opacity-60 grayscale transition-opacity hover:opacity-100"
                >
                  <img
                    src="/dev-logo.webp"
                    alt="Alexander Pralich"
                    width={90}
                    height={24}
                    loading="lazy"
                    className="h-6 w-auto"
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top">
                DEV &amp; ADS – ALEXPRALICH.RU
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
