import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/crm-api";
import { useAuth } from "../AuthContext";
import { useOptions } from "../useCrm";
import { useBillingReload } from "../billing/shared";
import TaskDialog from "./TaskDialog";
import { ENTITY_LINKS, GROUPS, PRIORITIES, taskDue, type Task } from "./shared";

type Resp = { items: Task[]; counts: { mine: number; overdue: number; today: number } };

const SCOPES = [
  { value: "mine", label: "Мои", icon: "UserCheck" },
  { value: "created", label: "Поручил я", icon: "Send" },
  { value: "all", label: "Все", icon: "Users" },
];

const TasksPage = ({ onOpen, openTask, onTaskOpened }: { onOpen: (resource: string, id: number) => void; openTask?: number | null; onTaskOpened?: () => void }) => {
  const { user } = useAuth();
  const { data: opts } = useOptions();
  const reload = useBillingReload();
  const [scope, setScope] = useState("mine");
  const [status, setStatus] = useState("open");
  const [assignee, setAssignee] = useState("");
  const [link, setLink] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Task | "new" | null>(null);

  const params = { resource: "tasks", scope, status, assignee_id: scope === "all" ? assignee || undefined : undefined, entity_type: link || undefined, search: search || undefined };
  const { data, isLoading } = useQuery<Resp>({ queryKey: ["crm", "tasks", params], queryFn: () => api(params) });
  const items = useMemo(() => data?.items ?? [], [data]);
  const { data: deep } = useQuery<{ item: Task }>({ queryKey: ["crm", "tasks", "item", openTask], queryFn: () => api({ resource: "tasks", id: openTask! }), enabled: !!openTask });
  useEffect(() => {
    if (openTask && deep?.item) { setDialog(deep.item); onTaskOpened?.(); }
  }, [openTask, deep, onTaskOpened]);
  const current = dialog && dialog !== "new" ? items.find((t) => t.id === dialog.id) || dialog : dialog;
  const groups = useMemo(() => GROUPS.map((g) => ({ ...g, items: items.filter((t) => taskDue(t).group === g.key) })).filter((g) => g.items.length), [items]);

  const toggle = async (t: Task) => {
    try {
      await api({ resource: "tasks", id: t.id }, "PUT", { done: !t.done_at });
      if (!t.done_at) toast.success("Задача выполнена");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const remove = async (t: Task) => {
    if (!confirm("Удалить задачу?")) return;
    try {
      await api({ resource: "tasks", id: t.id }, "DELETE");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const c = data?.counts;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Задачи</h1>
          <p className="mt-1 text-sm text-muted-foreground">Поручения сотрудникам — по сделкам, клиентам, лидам, партнёрам или просто так</p>
        </div>
        <button onClick={() => setDialog("new")} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icon name="Plus" size={16} />Новая задача
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Мои открытые", value: c?.mine ?? 0, icon: "ListTodo", cls: "" },
          { label: "На сегодня", value: c?.today ?? 0, icon: "CalendarClock", cls: c?.today ? "text-amber-700" : "" },
          { label: "Просрочено", value: c?.overdue ?? 0, icon: "AlarmClock", cls: c?.overdue ? "text-primary" : "" },
        ].map((s) => (
          <div key={s.label} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:gap-2"><Icon name={s.icon} size={14} className="hidden shrink-0 sm:block" /><span className="truncate">{s.label}</span></div>
            <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 lg:flex-row lg:items-center">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1 lg:flex">
          {SCOPES.map((s) => (
            <button key={s.value} onClick={() => setScope(s.value)} className={`inline-flex items-center justify-center whitespace-nowrap gap-1.5 rounded-lg px-3 py-1.5 text-sm ${scope === s.value ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
              <Icon name={s.icon} size={14} />{s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1 lg:flex">
          {[["open", "Открытые"], ["done", "Выполненные"], ["any", "Все"]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-sm sm:px-3 ${status === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {scope === "all" && (
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-9 min-w-0 rounded-lg border bg-background px-2 text-sm">
            <option value="">Все исполнители</option>
            {(opts?.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <select value={link} onChange={(e) => setLink(e.target.value)} className="h-9 min-w-0 rounded-lg border bg-background px-2 text-sm">
          <option value="">Любая привязка</option>
          {ENTITY_LINKS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          <option value="none">Без привязки</option>
        </select>
        <div className="relative lg:ml-auto lg:w-64">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по задачам" className="h-9 pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Icon name="CircleCheckBig" size={32} className="text-emerald-600" />
          <p className="font-medium">{status === "open" ? "Открытых задач нет" : "Задач не найдено"}</p>
          <button onClick={() => setDialog("new")} className="text-sm text-primary hover:underline">Поставить задачу</button>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${g.key === "overdue" ? "text-primary" : "text-muted-foreground"}`}>{g.label} · {g.items.length}</p>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {g.items.map((t) => {
                const due = taskDue(t);
                const pr = PRIORITIES[t.priority] || PRIORITIES.normal;
                const ent = ENTITY_LINKS.find((l) => l.value === t.entity_type);
                const canDelete = t.user_id === user?.id || user?.role === "admin";
                const who = t.assignee_id === user?.id ? "Мне" : t.assignee_name || "—";
                const sub = t.done_at && t.result_text ? `Результат: ${t.result_text}` : t.details;
                return (
                  <li key={t.id} className={g.key === "overdue" ? "bg-primary/[0.03]" : ""}>
                  <div className="flex min-w-0 items-start gap-3 px-3.5 py-3 md:hidden">
                    <button onClick={() => toggle(t)} aria-label={t.done_at ? "Вернуть в работу" : "Выполнено"}
                      className={`-m-1.5 flex h-8 w-8 shrink-0 items-center justify-center`}>
                      <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 ${t.done_at ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40"}`}>
                        {t.done_at && <Icon name="Check" size={14} />}
                      </span>
                    </button>
                    <div role="button" tabIndex={0} onClick={() => setDialog(t)} className="min-w-0 flex-1 active:opacity-70">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {t.priority !== "normal" && <Icon name={pr.icon} size={14} className={`shrink-0 ${pr.cls}`} />}
                        <p className={`min-w-0 flex-1 truncate text-[15px] font-medium ${t.done_at ? "text-muted-foreground line-through" : ""}`}>{t.text}</p>
                      </div>
                      {sub && <p className={`mt-0.5 truncate text-xs ${t.done_at && t.result_text ? "text-emerald-800" : "text-muted-foreground"}`}>{sub}</p>}
                      <div className="mt-1.5 flex min-w-0 items-center gap-3 whitespace-nowrap text-xs text-muted-foreground">
                        <span className={`inline-flex shrink-0 items-center gap-1 ${due.cls}`}><Icon name="Clock" size={12} />{due.label}</span>
                        <span className="inline-flex min-w-0 items-center gap-1"><Icon name="User" size={12} className="shrink-0" /><span className="truncate">{who}</span></span>
                        {!!t.members?.length && <span className="inline-flex shrink-0 items-center gap-0.5"><Icon name="Users" size={12} />+{t.members.length}</span>}
                        {Number(t.comments_count) > 0 && <span className="ml-auto inline-flex shrink-0 items-center gap-1"><Icon name="MessageSquare" size={12} />{t.comments_count}</span>}
                      </div>
                      {ent && t.entity_id ? (
                        <button onClick={(e) => { e.stopPropagation(); onOpen(t.entity_type!, t.entity_id!); }}
                          className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                          <Icon name={ent.icon} size={12} className="shrink-0" /><span className="truncate">{t.entity_title || ent.label}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="group hidden items-start gap-3 px-4 py-3 md:flex">
                    <button onClick={() => toggle(t)} title={t.done_at ? "Вернуть в работу" : "Выполнено"}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${t.done_at ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"}`}>
                      {t.done_at && <Icon name="Check" size={13} />}
                    </button>
                    <button onClick={() => setDialog(t)} className="min-w-0 flex-1 text-left">
                      <p className={`flex items-start gap-1.5 text-sm font-medium ${t.done_at ? "text-muted-foreground line-through" : ""}`}>
                        {t.priority !== "normal" && <Icon name={pr.icon} size={14} className={`mt-0.5 shrink-0 ${pr.cls}`} />}
                        <span className="break-words">{t.text}</span>
                      </p>
                      {t.done_at && t.result_text ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-emerald-800">Результат: {t.result_text}</p>
                      ) : t.details ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.details}</p> : null}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center gap-1 ${due.cls}`}><Icon name="Clock" size={12} />{due.label}</span>
                        <span className="inline-flex items-center gap-1"><Icon name="User" size={12} />{t.assignee_id === user?.id ? "Мне" : t.assignee_name || "—"}</span>
                        {!!t.members?.length && (
                          <span className="inline-flex items-center gap-1" title={t.members.map((m) => m.name).join(", ")}>
                            <Icon name="Users" size={12} />
                            {t.members.some((m) => m.id === user?.id) ? "я соисполнитель" : t.members.length === 1 ? `+ ${t.members[0].name}` : `+${t.members.length}`}
                          </span>
                        )}
                        {t.user_id !== t.assignee_id && t.author_name && <span className="inline-flex items-center gap-1"><Icon name="Send" size={12} />от {t.user_id === user?.id ? "меня" : t.author_name}</span>}
                        {Number(t.comments_count) > 0 && <span className="inline-flex items-center gap-1"><Icon name="MessageSquare" size={12} />{t.comments_count}</span>}
                        {t.result_text && <span className="inline-flex items-center gap-1 text-emerald-700"><Icon name="ClipboardCheck" size={12} />есть результат</span>}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {ent && t.entity_id ? (
                        <button onClick={() => onOpen(t.entity_type!, t.entity_id!)} className="inline-flex max-w-[180px] items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/70" title={`Открыть: ${ent.label.toLowerCase()}`}>
                          <Icon name={ent.icon} size={12} className="shrink-0" /><span className="truncate">{t.entity_title || ent.label}</span>
                        </button>
                      ) : null}
                      {canDelete && (
                        <button onClick={() => remove(t)} className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
                      )}
                    </div>
                  </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      {current && <TaskDialog key={current === "new" ? "new" : current.id} task={current === "new" ? null : current} onClose={() => setDialog(null)} />}
    </div>
  );
};

export default TasksPage;
