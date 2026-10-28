import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";

const LINKS = [
  { to: "/lechenie", icon: "HeartPulse", title: "Лечение", text: "Программы лечения зависимостей" },
  { to: "/uslugi", icon: "Stethoscope", title: "Услуги и цены", text: "Выезд нарколога, детокс, реабилитация" },
  { to: "/articles", icon: "BookOpen", title: "Статьи", text: "Полезные материалы для пациентов и близких" },
] as const;

const PageNotFound = () => (
  <div className="min-h-screen bg-background text-foreground">
    <main className="mx-auto flex max-w-site flex-col px-5 py-20 md:px-16 md:py-28">
      <span className="font-heading text-sm font-medium text-primary">Ошибка 404</span>
      <h1 className="mt-3 font-heading font-medium" style={{ fontSize: "clamp(34px, 5vw, 60px)", lineHeight: 1.04, letterSpacing: "-0.05em" }}>
        Страница не найдена
      </h1>
      <p className="mt-4 max-w-[640px] text-[1.1em] text-muted-foreground">
        Возможно, ссылка устарела или в адресе опечатка. Выберите нужный раздел или вернитесь на главную.
      </p>
      <div className="mt-10 grid gap-[7px] md:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="group flex flex-col rounded-2xl bg-card p-6 transition-shadow hover:shadow-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={l.icon} size={18} /></span>
            <span className="mt-4 font-heading text-[1.3em] font-medium leading-tight tracking-tight group-hover:text-primary">{l.title}</span>
            <span className="mt-2 text-sm text-muted-foreground">{l.text}</span>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-primary">Перейти<Icon name="ArrowRight" size={14} /></span>
          </Link>
        ))}
      </div>
      <Link to="/" className="mt-8 inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <Icon name="ArrowLeft" size={14} />На главную
      </Link>
    </main>
  </div>
);

export default PageNotFound;
