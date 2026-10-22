import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useFamilyAuth } from "./FamilyAuth";
import { parseServer } from "@/lib/msk";

const pad = (n: number) => String(n).padStart(2, "0");

export const useCountdown = (until?: string | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  const end = until ? parseServer(until).getTime() : 0;
  const left = Math.max(0, end - now);
  return {
    left,
    days: Math.floor(left / 86400000),
    hours: Math.floor((left % 86400000) / 3600000),
    minutes: Math.floor((left % 3600000) / 60000),
    seconds: Math.floor((left % 60000) / 1000),
  };
};

const TrialBanner = ({ go }: { go: (s: string) => void }) => {
  const { stats, refresh } = useFamilyAuth();
  const t = useCountdown(stats?.trial_ends_at);
  const hasPlan = !!stats?.plans?.length;

  useEffect(() => {
    if (stats?.trial_active && t.left === 0 && stats.trial_ends_at) refresh();
  }, [t.left, stats?.trial_active, stats?.trial_ends_at, refresh]);

  if (!stats?.trial_ends_at || hasPlan) return null;

  if (!stats.trial_active || t.left === 0) {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon name="Hourglass" size={18} /></span>
        <div className="flex-1">
          <p className="font-medium">Пробный период закончился</p>
          <p className="text-sm text-muted-foreground">Встречи и вебинары остаются доступны. Чтобы продолжить работу с ИИ-психологом и специалистами — выберите тариф.</p>
        </div>
        <button onClick={() => go("billing")} className="h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">Выбрать тариф</button>
      </div>
    );
  }

  const cells = [
    { v: t.days, l: "дн" },
    { v: t.hours, l: "ч" },
    { v: t.minutes, l: "мин" },
    { v: t.seconds, l: "сек" },
  ];

  return (
    <div className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl bg-ink p-4 text-ink-foreground md:flex-row md:items-center md:p-5">
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/40 blur-3xl" />
      <div className="relative flex flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon name="Gift" size={18} /></span>
        <div>
          <p className="font-medium">Пробный период: полный доступ бесплатно</p>
          <p className="text-sm text-white/60">ИИ-психолог и вопросы специалистам открыты без ограничений</p>
        </div>
      </div>
      <div className="relative flex items-center gap-1.5">
        {cells.map((c) => (
          <div key={c.l} className="flex min-w-[52px] flex-col items-center rounded-xl bg-white/10 px-2 py-1.5">
            <span className="font-heading text-xl font-semibold tabular-nums leading-tight">{pad(c.v)}</span>
            <span className="text-[10px] uppercase tracking-wider text-white/50">{c.l}</span>
          </div>
        ))}
      </div>
      <button onClick={() => go("billing")} className="relative h-10 shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-ink hover:bg-white/90">Тарифы</button>
    </div>
  );
};

export default TrialBanner;
