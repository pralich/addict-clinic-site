import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { broadcastApi, type Broadcast } from "@/lib/broadcast-api";
import { RELATIONS } from "@/lib/family-api";
import { ROLES } from "../config";
import BroadcastForm from "./BroadcastForm";
import { fmtMsk } from "@/lib/msk";

const STATUS: Record<Broadcast["status"], { label: string; cls: string; icon: string }> = {
  scheduled: { label: "Запланирована", cls: "bg-amber-100 text-amber-800", icon: "CalendarClock" },
  preparing: { label: "Готовится", cls: "bg-sky-100 text-sky-800", icon: "Loader2" },
  sending: { label: "Отправляется", cls: "bg-sky-100 text-sky-800", icon: "Loader2" },
  done: { label: "Отправлена", cls: "bg-emerald-100 text-emerald-800", icon: "CircleCheck" },
  canceled: { label: "Отменена", cls: "bg-neutral-200 text-neutral-600", icon: "CircleX" },
};

const dt = (s: string | null) => (s ? fmtMsk(s, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

const audienceText = (a: Broadcast["audience"]) => {
  const out: string[] = [];
  if (a.family?.on) {
    if (a.family.ids?.length) out.push(`родственники: ${a.family.ids.length} чел.`);
    else {
      const f = [a.family.relations?.length ? a.family.relations.map((r) => RELATIONS[r] || r).join(", ") : "все родственники"];
      if (a.family.active_days) f.push(`активны за ${a.family.active_days} дн.`);
      if (a.family.subscribers) f.push("с тарифом");
      out.push(f.join(" · "));
    }
  }
  if (a.staff?.on) {
    if (a.staff.ids?.length) out.push(`сотрудники: ${a.staff.ids.length} чел.`);
    else out.push(a.staff.roles?.length ? a.staff.roles.map((r) => ROLES[r] || r).join(", ") : "все сотрудники");
  }
  return out.join(" + ");
};

const BroadcastPage = () => {
  const [tab, setTab] = useState<"new" | "history">("new");
  const { data, refetch } = useQuery({
    queryKey: ["crm", "broadcasts"],
    queryFn: broadcastApi.list,
    refetchInterval: (q) => (q.state.data?.items.some((b) => ["sending", "preparing"].includes(b.status)) ? 4000 : 30000),
  });
  const items = data?.items || [];
  const planned = items.filter((b) => b.status === "scheduled").length;

  const cancel = async (id: number) => {
    try {
      await broadcastApi.cancel(id);
      toast("Рассылка отменена");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Push-рассылки</h1>
          <p className="text-sm text-muted-foreground">Сообщения родственникам из кабинета близких и сотрудникам CRM с включёнными уведомлениями</p>
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {([["new", "Новая рассылка"], ["history", `История${planned ? ` · ${planned} в плане` : ""}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3.5 py-1.5 text-sm ${tab === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === "new" ? (
          <BroadcastForm recipients={data?.recipients || []} onDone={() => { refetch(); setTab("history"); }} />
        ) : items.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">Рассылок пока не было</p>
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {items.map((b) => {
              const s = STATUS[b.status];
              const progress = b.devices ? Math.round(((b.delivered + b.failed) / b.devices) * 100) : 0;
              return (
                <div key={b.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
                        <Icon name={s.icon} size={12} className={s.icon === "Loader2" ? "animate-spin" : ""} />{s.label}
                      </span>
                      <p className="font-medium">{b.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {audienceText(b.audience)}{b.url && <> · ссылка <span className="font-mono">{b.url}</span></>}{b.author && ` · ${b.author}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 text-xs text-muted-foreground md:w-56 md:items-end md:text-right">
                    <span>{b.status === "scheduled" ? `Отправка ${dt(b.scheduled_at)}` : `Начата ${dt(b.started_at || b.scheduled_at)}`}</span>
                    {b.status === "scheduled" ? (
                      <>
                        <span>Получателей сейчас: {b.recipients}</span>
                        <button onClick={() => cancel(b.id)} className="mt-1 self-start rounded-full bg-secondary px-3 py-1 text-foreground hover:bg-secondary/70 md:self-end">Отменить</button>
                      </>
                    ) : b.status !== "canceled" && (
                      <>
                        <span className="text-foreground">Доставлено <b>{b.delivered}</b> из {b.devices} устройств</span>
                        <span>Людей: {b.recipients}{b.failed > 0 && <span className="text-red-600"> · не доставлено {b.failed}</span>}</span>
                        {b.status === "sending" && <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary md:w-40"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastPage;
