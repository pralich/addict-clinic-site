import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { familyApi, type FamilyEvent } from "@/lib/family-api";
import { useFamilyAuth } from "./FamilyAuth";
import { fmtMskDate, fmtMskTime, mskParts, parseMskLocal } from "@/lib/msk";

const KIND = {
  webinar: { label: "Онлайн-вебинар", icon: "MonitorPlay", cls: "bg-sky-100 text-sky-800" },
  offline: { label: "Офлайн-встреча", icon: "MapPin", cls: "bg-amber-100 text-amber-800" },
};

const toIcs = (e: FamilyEvent) => {
  const s = parseMskLocal(e.starts_at);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(s.getTime() + e.duration_min * 60000);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `DTSTART:${f(s)}`, `DTEND:${f(end)}`, `SUMMARY:${e.title}`, `LOCATION:${e.location || e.link || "Онлайн"}`, "END:VEVENT", "END:VCALENDAR"].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "event.ics";
  a.click();
};

const EventCard = ({ e, onChange }: { e: FamilyEvent; onChange: () => void }) => {
  const [busy, setBusy] = useState(false);
  const d = parseMskLocal(e.starts_at);
  const past = d.getTime() + e.duration_min * 60000 < Date.now();
  const full = !!e.capacity && e.regs >= e.capacity && !e.registered;
  const k = KIND[e.kind] || KIND.webinar;

  const toggle = async () => {
    setBusy(true);
    try {
      if (e.registered) await familyApi.cancel_event(e.id);
      else await familyApi.register_event(e.id);
      toast.success(e.registered ? "Запись отменена" : "Вы записаны! Детали появились в карточке события");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl bg-card sm:flex-row ${past ? "opacity-60" : ""}`}>
      <div className={`flex shrink-0 flex-row items-center gap-3 p-5 sm:w-[120px] sm:flex-col sm:justify-center sm:gap-0 ${e.registered ? "bg-primary text-primary-foreground" : "bg-ink text-ink-foreground"}`}>
        <p className="font-heading text-[2.2em] font-semibold leading-none">{mskParts(d).day}</p>
        <p className="text-sm sm:mt-1">{fmtMskDate(d, { month: "long" })}</p>
        <p className="text-sm opacity-70 sm:mt-2">{fmtMskTime(d)} МСК</p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${k.cls}`}><Icon name={k.icon} size={12} />{k.label}</span>
          <span className="text-xs text-muted-foreground">{e.duration_min} мин</span>
          {e.capacity && !past && <span className="text-xs text-muted-foreground">· мест: {Math.max(0, e.capacity - e.regs)} из {e.capacity}</span>}
          {e.registered && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><Icon name="Check" size={12} />Вы записаны</span>}
        </div>
        <h3 className="mt-3 font-heading text-lg font-semibold leading-snug">{e.title}</h3>
        {e.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.description}</p>}
        <div className="mt-3 flex flex-col gap-1 text-sm">
          {e.host && <p className="flex items-center gap-2"><Icon name="UserRound" size={14} className="text-muted-foreground" />{e.host}</p>}
          {e.location && <p className="flex items-center gap-2"><Icon name="MapPin" size={14} className="text-muted-foreground" />{e.location}</p>}
        </div>
        {!past && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {e.registered && e.link && (
              <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"><Icon name="Video" size={15} />Ссылка на эфир</a>
            )}
            {e.registered && !e.link && e.kind === "webinar" && <span className="text-sm text-muted-foreground">Ссылка на эфир появится здесь перед началом</span>}
            <button disabled={busy || full} onClick={toggle}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium disabled:opacity-50 ${e.registered ? "border bg-background" : "bg-ink text-ink-foreground"}`}>
              {busy && <Icon name="Loader2" size={14} className="animate-spin" />}
              {e.registered ? "Отменить запись" : full ? "Мест нет" : "Записаться"}
            </button>
            {e.registered && (
              <button onClick={() => toIcs(e)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"><Icon name="CalendarPlus" size={15} />В календарь</button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

const EventsSection = () => {
  const qc = useQueryClient();
  const { refresh } = useFamilyAuth();
  const { data, isLoading } = useQuery({ queryKey: ["family", "events"], queryFn: familyApi.events });
  const [filter, setFilter] = useState<"all" | "webinar" | "offline" | "mine">("all");
  const items = (data?.items ?? []).filter((e) => filter === "all" || (filter === "mine" ? e.registered : e.kind === filter));
  const reload = () => { qc.invalidateQueries({ queryKey: ["family", "events"] }); refresh(); };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {([["all", "Все события"], ["webinar", "Вебинары"], ["offline", "Офлайн-встречи"], ["mine", "Мои записи"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-2 text-sm ${filter === k ? "bg-ink text-ink-foreground" : "bg-card"}`}>{l}</button>
        ))}
      </div>
      {isLoading && <div className="h-48 animate-pulse rounded-2xl bg-card" />}
      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center text-muted-foreground">
          <Icon name="CalendarX" size={32} className="mx-auto" />
          <p className="mt-3">{filter === "mine" ? "Вы пока никуда не записаны" : "Ближайших событий пока нет"}</p>
        </div>
      )}
      <div className="grid gap-4 2xl:grid-cols-2">
        {items.map((e) => <EventCard key={e.id} e={e} onChange={reload} />)}
      </div>
    </div>
  );
};

export default EventsSection;
