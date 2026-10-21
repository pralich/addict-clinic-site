import { useState } from "react";
import Icon from "@/components/ui/icon";
import StatusBadge from "../StatusBadge";
import { CHANNELS, LEAD_STATUS } from "../config";
import { DEVICE_ICON, EVENT_ICON, cleanTitle, clock, dur, host, utc, type Visit } from "./types";

type Props = { v: Visit; live: boolean; onVisitor: (id: string) => void; onOpen: (resource: string, id: number) => void };

const VisitCard = ({ v, live, onVisitor, onOpen }: Props) => {
  const [open, setOpen] = useState(false);
  const ch = CHANNELS[v.channel || ""] || CHANNELS.direct || { label: "Прямой заход", icon: "MousePointerClick" };
  const online = v.idle_sec < 90;
  const searches = [...(v.utm_term ? [{ q: v.utm_term, at: 0, ad: true }] : []), ...v.searches.map((s) => ({ ...s, ad: false }))];
  const timeline = [
    ...v.pages.map((p) => ({ at: p.at, kind: "page" as const, p })),
    ...v.events.map((e) => ({ at: e.at, kind: "event" as const, e })),
    ...v.searches.map((s) => ({ at: s.at, kind: "search" as const, s })),
  ].sort((a, b) => a.at - b.at);

  return (
    <div className={`rounded-xl border bg-card transition-colors ${v.lead_id ? "border-emerald-300" : ""}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-col gap-3 p-4 text-left">
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-neutral-300"}`} title={online ? "На сайте" : "Ушёл"} />
          {v.lead_id ? (
            <span className="flex items-center gap-1.5 font-medium">
              <Icon name="UserCheck" size={15} className="text-emerald-600" />
              {v.lead_name || "Лид"}{v.lead_contact && <span className="font-normal text-muted-foreground">· {v.lead_contact}</span>}
            </span>
          ) : (
            <span className="font-medium">Посетитель #{v.visitor_id.slice(0, 6)}</span>
          )}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{v.visit_no === 1 ? "новый" : `${v.visit_no}-й визит`}</span>
          <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {v.device && <Icon name={DEVICE_ICON[v.device] || "Monitor"} size={14} />}
            {v.browser}
            <span>{live ? `на сайте ${dur(v.duration_sec)}` : `${clock(v.started_at)}–${clock(v.last_seen)}`}</span>
            <Icon name="ChevronDown" size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </div>

        <div className="grid w-full gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{online ? "Сейчас смотрит" : "Последняя страница"}</p>
            <p className="truncate font-medium" title={v.current_path || ""}>{cleanTitle(v.current_title) || v.current_path || "—"}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Откуда</p>
            <p className="flex items-center gap-1.5 truncate"><Icon name={ch.icon} size={13} className="shrink-0 text-primary" />{ch.label}{v.utm_campaign && <span className="truncate text-muted-foreground">· {v.utm_campaign}</span>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Страниц · активное время</p>
            <p className="tabular-nums">{v.pages.length} · {dur(v.active_seconds)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Что ищет</p>
            <p className="truncate">{searches.length ? searches.map((s) => s.q).join(", ") : <span className="text-muted-foreground">—</span>}</p>
          </div>
        </div>

        {v.events.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {v.events.slice(-4).map((e, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                <Icon name={EVENT_ICON[e.type] || "MousePointerClick"} size={12} />{e.label}
              </span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Путь по сайту</p>
              <ol className="relative space-y-2.5 border-l pl-4">
                {timeline.map((it, i) => (
                  <li key={i} className="relative text-sm">
                    <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${it.kind === "page" ? "bg-ink" : it.kind === "search" ? "bg-sky-500" : "bg-primary"}`} />
                    <span className="mr-2 text-xs tabular-nums text-muted-foreground">{clock(it.at)}</span>
                    {it.kind === "page" && (
                      <>
                        <a href={it.p.path} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">{cleanTitle(it.p.title) || it.p.path}</a>
                        <span className="ml-2 text-xs text-muted-foreground">{dur(it.p.sec)}</span>
                      </>
                    )}
                    {it.kind === "search" && <span className="text-sky-700">Искал: «{it.s.q}»</span>}
                    {it.kind === "event" && <span className="font-medium text-primary">{it.e.label}</span>}
                  </li>
                ))}
              </ol>
            </div>
            <dl className="grid h-fit grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-secondary/50 p-3 text-xs">
              <dt className="text-muted-foreground">Начало</dt><dd>{utc(v.started_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</dd>
              {host(v.referrer) && <><dt className="text-muted-foreground">Пришёл с</dt><dd className="break-all">{host(v.referrer)}</dd></>}
              {v.utm_source && <><dt className="text-muted-foreground">Источник</dt><dd>{v.utm_source}{v.utm_medium ? ` / ${v.utm_medium}` : ""}</dd></>}
              {v.utm_term && <><dt className="text-muted-foreground">Фраза рекламы</dt><dd>{v.utm_term}</dd></>}
              {v.landing_url && <><dt className="text-muted-foreground">Вход</dt><dd className="break-all">{(() => { try { return decodeURIComponent(new URL(v.landing_url).pathname); } catch { return v.landing_url; } })()}</dd></>}
              {v.lead_status && <><dt className="text-muted-foreground">Статус лида</dt><dd><StatusBadge map={LEAD_STATUS} value={v.lead_status} /></dd></>}
            </dl>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {v.lead_id && (
              <button onClick={() => onOpen("leads", v.lead_id!)} className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                <Icon name="Inbox" size={14} />Открыть лида
              </button>
            )}
            {v.visit_no > 1 && (
              <button onClick={() => onVisitor(v.visitor_id)} className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm hover:bg-secondary/70">
                <Icon name="History" size={14} />Все визиты ({v.visit_no})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitCard;
