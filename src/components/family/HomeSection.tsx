import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { familyApi } from "@/lib/family-api";
import { fetchArticles } from "@/lib/articles";
import { useFamilyAuth } from "./FamilyAuth";
import PushCard from "./PushCard";

const FAMILY_SLUGS = ["sozavisimost-kak-pomoch-sebe", "pomoshch-alkogolikam-kak-ugovorit-lechitsya", "pomoshch-narkomanam-chto-delat-blizkim", "priznaki-narkomanii-u-blizkogo"];

const HomeSection = ({ go }: { go: (s: string) => void }) => {
  const { user, stats } = useFamilyAuth();
  const { data: ev } = useQuery({ queryKey: ["family", "events"], queryFn: familyApi.events });
  const { data: art } = useQuery({ queryKey: ["articles"], queryFn: () => fetchArticles() });
  const next = (ev?.items ?? []).find((e) => new Date(e.starts_at) > new Date());
  const articles = (art?.items ?? []).filter((a) => FAMILY_SLUGS.includes(a.slug)).slice(0, 3);
  const hour = new Date().getHours();
  const greet = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  const cards = [
    { id: "ai", icon: "Sparkles", title: "ИИ-психолог", text: "Отрепетируйте разговор с близким, подберите слова и составьте план", stat: stats?.ai_chats ? `${stats.ai_chats} диалогов` : "24/7", accent: true },
    { id: "questions", icon: "MessageCircleQuestion", title: "Вопрос психологу", text: "Письменный ответ специалиста клиники в течение суток", stat: stats?.answered ? `${stats.answered} ответов` : stats?.waiting ? `${stats.waiting} ждут ответа` : "Бесплатно" },
    { id: "events", icon: "CalendarHeart", title: "Встречи и вебинары", text: "Группы поддержки офлайн и онлайн-эфиры с врачами", stat: stats?.events ? `${stats.events} записей` : "Записаться" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[2em] font-semibold tracking-[-0.03em]">{greet}, {user?.name}</h1>
        <p className="mt-1 text-muted-foreground">Это ваше пространство поддержки. Начните с того, что сейчас важнее всего.</p>
      </div>

      <PushCard />

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <button key={c.id} onClick={() => go(c.id)}
            className={`group flex flex-col rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 ${c.accent ? "bg-ink text-ink-foreground" : "bg-card hover:shadow-lg"}`}>
            <div className="flex items-center justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.accent ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}><Icon name={c.icon} size={20} /></span>
              <span className={`rounded-full px-2.5 py-1 text-xs ${c.accent ? "bg-white/10" : "bg-secondary"}`}>{c.stat}</span>
            </div>
            <p className="mt-5 font-heading text-lg font-semibold">{c.title}</p>
            <p className={`mt-1 text-sm ${c.accent ? "text-white/65" : "text-muted-foreground"}`}>{c.text}</p>
            <span className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${c.accent ? "text-white" : "text-primary"}`}>Открыть<Icon name="ArrowRight" size={14} className="transition-transform group-hover:translate-x-1" /></span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {next ? (
          <div className="rounded-2xl bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ближайшее событие</p>
            <div className="mt-3 flex gap-4">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <span className="font-heading text-2xl font-semibold leading-none">{new Date(next.starts_at).getDate()}</span>
                <span className="text-[11px]">{new Date(next.starts_at).toLocaleDateString("ru-RU", { month: "short" })}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{next.kind === "offline" ? "Офлайн-встреча" : "Онлайн-вебинар"} · {new Date(next.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                <p className="mt-1 font-heading font-semibold leading-snug">{next.title}</p>
                <button onClick={() => go("events")} className="mt-2 text-sm font-medium text-primary">{next.registered ? "Вы записаны · подробнее" : "Записаться"} →</button>
              </div>
            </div>
          </div>
        ) : <div />}
        <div className="flex items-start gap-4 rounded-2xl bg-primary p-5 text-primary-foreground">
          <Icon name="Phone" size={22} className="shrink-0" />
          <div>
            <p className="font-heading font-semibold">Ситуация срочная?</p>
            <p className="mt-1 text-sm text-white/80">Запой, передозировка, агрессия — звоните на линию 24/7. При угрозе жизни — 112.</p>
            <a href="tel:+78002221125" className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-foreground">8-800-222-11-25</a>
          </div>
        </div>
      </div>

      {articles.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Полезно прочитать</h2>
            <Link to="/articles" className="text-sm font-medium text-primary">Все статьи →</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {articles.map((a) => (
              <Link key={a.id} to={`/articles/${a.slug}`} target="_blank" className="group flex gap-3 rounded-xl bg-card p-3 hover:shadow-md">
                {a.cover_url && <img src={a.cover_url} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
                <p className="line-clamp-3 text-sm font-medium leading-snug group-hover:text-primary">{a.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeSection;
