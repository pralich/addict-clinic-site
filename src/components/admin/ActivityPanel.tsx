import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { useAuth } from "./AuthContext";
import { useCrmMutation, useOptions } from "./useCrm";
import { ACTIVITY_KINDS, fmtDate } from "./config";

type Activity = {
  id: number;
  kind: string;
  text: string;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
  due_at?: string | null;
  done_at?: string | null;
  result?: string | null;
  direction?: string | null;
  duration_min?: number | null;
  assignee_id?: number | null;
  assignee_name?: string | null;
};

const CALL_RESULTS: Record<string, { label: string; cls: string }> = {
  reached: { label: "Дозвонились", cls: "bg-emerald-100 text-emerald-800" },
  no_answer: { label: "Не ответил", cls: "bg-amber-100 text-amber-800" },
  busy: { label: "Занято", cls: "bg-amber-100 text-amber-800" },
  callback: { label: "Перезвонить", cls: "bg-sky-100 text-sky-800" },
  wrong_number: { label: "Неверный номер", cls: "bg-neutral-200 text-neutral-700" },
};

const MEETING_RESULTS: Record<string, { label: string; cls: string }> = {
  held: { label: "Состоялась", cls: "bg-emerald-100 text-emerald-800" },
  rescheduled: { label: "Перенесена", cls: "bg-amber-100 text-amber-800" },
  cancelled: { label: "Отменена", cls: "bg-neutral-200 text-neutral-700" },
  no_show: { label: "Не пришёл", cls: "bg-primary/10 text-primary" },
};

const KIND_STYLE: Record<string, string> = {
  note: "bg-amber-100 text-amber-700",
  call: "bg-emerald-100 text-emerald-700",
  meeting: "bg-violet-100 text-violet-700",
  task: "bg-sky-100 text-sky-700",
  system: "bg-secondary text-muted-foreground",
};

const PLACEHOLDER: Record<string, string> = {
  note: "Что важно знать о человеке, договорённости…",
  call: "О чём говорили, к чему пришли…",
  meeting: "Тема встречи, место или ссылка на видеосвязь…",
  task: "Что нужно сделать, например «Перезвонить и уточнить дату госпитализации»",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const presets = () => {
  const now = new Date();
  const inHour = new Date(now.getTime() + 60 * 60 * 1000);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const week = new Date(now);
  week.setDate(now.getDate() + 7);
  week.setHours(10, 0, 0, 0);
  return [
    { label: "Через час", value: toLocalInput(inHour) },
    { label: "Завтра 10:00", value: toLocalInput(tomorrow) },
    { label: "Через неделю", value: toLocalInput(week) },
  ];
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === y.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const dueState = (a: Activity) => {
  if (a.done_at || !a.due_at) return null;
  const diff = new Date(a.due_at).getTime() - Date.now();
  if (diff < 0) return { label: "Просрочено", cls: "text-primary font-medium" };
  if (diff < 24 * 60 * 60 * 1000) return { label: "Сегодня", cls: "text-amber-700 font-medium" };
  return null;
};

type Props = { resource: string; id: number; activities: Activity[] };

const ActivityPanel = ({ resource, id, activities }: Props) => {
  const { user } = useAuth();
  const mut = useCrmMutation();
  const [kind, setKind] = useState("note");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [result, setResult] = useState("");
  const [direction, setDirection] = useState("out");
  const [duration, setDuration] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: opts } = useOptions();
  const [assignee, setAssignee] = useState<string>("");

  const reset = () => { setText(""); setDue(""); setResult(""); setDuration(""); };

  const submit = () => {
    if (!text.trim()) return;
    if (kind === "task" && !due) { toast.error("Укажите срок задачи"); return; }
    mut.mutate(
      {
        params: { resource: "activities" },
        method: "POST",
        body: {
          entity_type: resource, entity_id: id, kind, text,
          due_at: due ? new Date(due).toISOString() : undefined,
          result: result || undefined,
          direction: kind === "call" ? direction : undefined,
          duration_min: duration || undefined,
          assignee_id: kind === "task" ? Number(assignee || user?.id) : undefined,
        },
      },
      { onSuccess: () => { reset(); toast.success(kind === "task" ? "Задача поставлена" : kind === "meeting" ? "Встреча запланирована" : "Добавлено"); } },
    );
  };

  const update = (aid: number, body: Record<string, unknown>) => mut.mutate({ params: { resource: "activities", id: aid }, method: "PUT", body });
  const remove = (aid: number) => confirm("Удалить запись?") && mut.mutate({ params: { resource: "activities", id: aid }, method: "DELETE" });

  const planned = useMemo(
    () => activities.filter((a) => (a.kind === "task" || a.kind === "meeting") && !a.done_at && a.due_at).sort((a, b) => +new Date(a.due_at!) - +new Date(b.due_at!)),
    [activities],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    activities.forEach((a) => { c[a.kind] = (c[a.kind] || 0) + 1; });
    return c;
  }, [activities]);

  const timeline = useMemo(() => {
    const list = activities.filter((a) => filter === "all" || a.kind === filter);
    const groups: { day: string; items: Activity[] }[] = [];
    list.forEach((a) => {
      const d = dayLabel(a.created_at);
      const g = groups[groups.length - 1];
      if (g && g.day === d) g.items.push(a);
      else groups.push({ day: d, items: [a] });
    });
    return groups;
  }, [activities, filter]);

  const results = kind === "call" ? CALL_RESULTS : kind === "meeting" ? MEETING_RESULTS : null;
  const canDelete = (a: Activity) => a.kind !== "system" && (a.user_id === user?.id || user?.role === "admin");

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border bg-card">
        <div className="flex border-b">
          {["note", "call", "meeting", "task"].map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setResult(""); }}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-sm transition-colors ${kind === k ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={ACTIVITY_KINDS[k].icon} size={15} />
              <span className="hidden sm:inline">{ACTIVITY_KINDS[k].label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 p-3">
          {kind === "call" && (
            <div className="flex gap-1">
              {[["out", "Исходящий", "PhoneOutgoing"], ["in", "Входящий", "PhoneIncoming"]].map(([v, l, ic]) => (
                <button key={v} onClick={() => setDirection(v)} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${direction === v ? "bg-ink text-ink-foreground" : "bg-secondary"}`}>
                  <Icon name={ic} size={12} />{l}
                </button>
              ))}
            </div>
          )}

          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER[kind]}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }} />

          {(kind === "task" || kind === "meeting") && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{kind === "task" ? "Срок:" : "Когда:"}</span>
                {presets().map((p) => (
                  <button key={p.label} onClick={() => setDue(p.value)} className={`rounded-full px-2.5 py-1 text-xs ${due === p.value ? "bg-ink text-ink-foreground" : "bg-secondary hover:bg-secondary/70"}`}>{p.label}</button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 w-full sm:w-[220px]" />
                {kind === "task" && (
                  <select value={assignee || String(user?.id ?? "")} onChange={(e) => setAssignee(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                    {(opts?.users || []).map((u) => <option key={u.id} value={u.id}>{u.id === user?.id ? `Мне (${u.name})` : u.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {results && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Итог:</span>
              {Object.entries(results).map(([k, r]) => (
                <button key={k} onClick={() => setResult(result === k ? "" : k)} className={`rounded-full border px-2.5 py-1 text-xs ${result === k ? `${r.cls} border-transparent font-medium` : "hover:bg-secondary"}`}>{r.label}</button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {(kind === "call" || kind === "meeting") ? (
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="0" className="h-8 w-16 text-sm" />
                <span className="text-xs text-muted-foreground">мин</span>
              </div>
            ) : <span className="hidden text-xs text-muted-foreground sm:block">Ctrl + Enter — сохранить</span>}
            <Button size="sm" onClick={submit} disabled={!text.trim() || mut.isPending}>
              {kind === "task" ? "Поставить задачу" : kind === "meeting" ? (result ? "Сохранить встречу" : "Запланировать") : kind === "call" ? "Записать звонок" : "Добавить заметку"}
            </Button>
          </div>
        </div>
      </div>

      {planned.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Запланировано · {planned.length}</p>
          <div className="flex flex-col gap-2">
            {planned.map((a) => {
              const st = dueState(a);
              return (
                <div key={a.id} className={`flex items-start gap-3 rounded-xl border p-3 ${st?.label === "Просрочено" ? "border-primary/40 bg-primary/5" : "bg-card"}`}>
                  {a.kind === "task" ? (
                    <button onClick={() => update(a.id, { done: true })} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10" title="Выполнено" />
                  ) : (
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${KIND_STYLE.meeting}`}><Icon name="Users" size={13} /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm">{a.text}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <Icon name="Clock" size={12} />
                      <span className={st?.cls}>{fmtDate(a.due_at!, true)}{st ? ` · ${st.label}` : ""}</span>
                      <span>· {a.kind === "task" && a.assignee_name ? (a.assignee_id === user?.id ? "вам" : a.assignee_name) : a.user_name || "—"}</span>
                      {a.kind === "task" && a.assignee_id !== a.user_id && a.user_name && <span>· от {a.user_name}</span>}
                    </p>
                    {a.kind === "meeting" && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(MEETING_RESULTS).map(([k, r]) => (
                          <button key={k} onClick={() => update(a.id, { result: k })} className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-secondary">{r.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Таймлайн</p>
          <div className="flex flex-wrap gap-1">
            {[["all", "Все", activities.length], ...["note", "call", "meeting", "task", "system"].map((k) => [k, ACTIVITY_KINDS[k].label, counts[k] || 0])]
              .filter(([k, , c]) => k === "all" || Number(c) > 0)
              .map(([k, l, c]) => (
                <button key={k as string} onClick={() => setFilter(k as string)} className={`rounded-full px-2.5 py-0.5 text-xs ${filter === k ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {l} <span className="opacity-60">{c}</span>
                </button>
              ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Записей пока нет</p>
        ) : (
          <div className="flex flex-col gap-5">
            {timeline.map((g) => (
              <div key={g.day}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{g.day}</p>
                <ol className="relative flex flex-col gap-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border">
                  {g.items.map((a) => {
                    const res = a.result ? (a.kind === "call" ? CALL_RESULTS : MEETING_RESULTS)[a.result] : null;
                    const st = dueState(a);
                    return (
                      <li key={a.id} className="group relative flex gap-3">
                        <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${KIND_STYLE[a.kind] || KIND_STYLE.system}`}>
                          <Icon name={a.kind === "call" ? (a.direction === "in" ? "PhoneIncoming" : "PhoneOutgoing") : ACTIVITY_KINDS[a.kind]?.icon || "Dot"} size={13} />
                        </span>
                        <div className={`min-w-0 flex-1 ${a.kind === "system" ? "pt-1" : "rounded-xl border bg-card px-3 py-2.5"}`}>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">{a.kind === "call" ? (a.direction === "in" ? "Входящий звонок" : "Исходящий звонок") : ACTIVITY_KINDS[a.kind]?.label}</span>
                            <span>· {a.user_name || "Сайт"} · {time(a.created_at)}</span>
                            {canDelete(a) && (
                              <button onClick={() => remove(a.id)} className="ml-auto opacity-0 transition-opacity hover:text-primary group-hover:opacity-100" title="Удалить"><Icon name="Trash2" size={13} /></button>
                            )}
                          </div>
                          <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${a.kind === "task" && a.done_at ? "text-muted-foreground line-through" : ""} ${a.kind === "system" ? "text-muted-foreground" : ""}`}>{a.text}</p>
                          {(res || a.duration_min || a.due_at) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                              {res && <span className={`rounded-full px-2 py-0.5 ${res.cls}`}>{res.label}</span>}
                              {!!a.duration_min && <span className="text-muted-foreground">{a.duration_min} мин</span>}
                              {a.due_at && (
                                <span className={`flex items-center gap-1 ${st?.cls || "text-muted-foreground"}`}>
                                  <Icon name="Clock" size={11} />
                                  {a.kind === "task" ? "до " : ""}{fmtDate(a.due_at, true)}{st ? ` · ${st.label}` : ""}
                                </span>
                              )}
                              {a.kind === "task" && (
                                <button onClick={() => update(a.id, { done: !a.done_at })} className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 ${a.done_at ? "bg-emerald-100 text-emerald-800" : "bg-secondary hover:bg-secondary/70"}`}>
                                  <Icon name={a.done_at ? "CheckCheck" : "Check"} size={11} />
                                  {a.done_at ? "Выполнено" : "Отметить выполненной"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPanel;
