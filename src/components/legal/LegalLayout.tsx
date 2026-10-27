import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import Icon from "@/components/ui/icon";
import { DOC_DATE, LEGAL_LINKS } from "@/lib/legal";

const LegalLayout = ({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto grid max-w-[1180px] gap-10 px-5 pb-20 pt-28 md:px-10 lg:grid-cols-[240px_1fr] lg:pt-32">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Документы</p>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${pathname === l.href ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="min-w-0">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="CalendarCheck" size={15} />Редакция от {DOC_DATE}
          </p>
          {lead && <div className="mt-6 rounded-2xl bg-secondary p-5 text-[0.95em] leading-relaxed">{lead}</div>}
          <div className="legal-doc mt-8">{children}</div>
          <button onClick={() => window.print()} className="mt-10 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-secondary print:hidden">
            <Icon name="Printer" size={15} />Распечатать или сохранить в PDF
          </button>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default LegalLayout;
