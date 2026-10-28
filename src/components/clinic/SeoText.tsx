import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import Reveal from "./Reveal";
import { TREATMENTS } from "@/lib/treatments";
import { HOME_SEO_INTRO, HOME_SEO_PROGRAMS_H2, HOME_SEO_SECTIONS, parseLinks } from "@/lib/home-seo";

const H2 = "font-heading text-[1.6em] font-medium leading-[1.15] tracking-[-0.035em]";

const Para = ({ text }: { text: string }) => (
  <p className="mt-3 leading-[1.6] text-muted-foreground">
    {parseLinks(text).map((c, i) =>
      c.href ? (
        <Link key={i} to={c.href} className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
          {c.text}
        </Link>
      ) : (
        <span key={i}>{c.text}</span>
      ),
    )}
  </p>
);

const SeoText = () => (
  <section id="about-treatment" className="mx-auto max-w-site px-5 py-20 md:px-16 md:py-24">
    <Reveal className="mx-auto max-w-[860px]">
      <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight text-muted-foreground">
        <i className="block h-2.5 w-2.5 rotate-45 bg-primary" />
        О лечении
      </span>
      <p className="mt-4 text-[1.07em] leading-[1.6]">{HOME_SEO_INTRO}</p>

      <h2 className={`mt-10 ${H2}`}>{HOME_SEO_PROGRAMS_H2}</h2>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {TREATMENTS.map((t) => (
          <li key={t.slug}>
            <Link
              to={t.path}
              className="group flex h-full items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5 transition-transform hover:-translate-y-0.5"
            >
              <span>
                <span className="block font-medium tracking-tight">{t.menu}</span>
                <span className="mt-0.5 block text-[0.85em] text-muted-foreground">{t.hint}</span>
              </span>
              <Icon name="ArrowRight" size={16} className="shrink-0 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.94em]">
        <Link to="/lechenie" className="font-medium underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
          Все направления лечения
        </Link>
      </p>

      {HOME_SEO_SECTIONS.map((s) => (
        <div key={s.h2} className="mt-10">
          <h2 className={H2}>{s.h2}</h2>
          {s.paras.map((p, i) => <Para key={i} text={p} />)}
        </div>
      ))}
    </Reveal>
  </section>
);

export default SeoText;
