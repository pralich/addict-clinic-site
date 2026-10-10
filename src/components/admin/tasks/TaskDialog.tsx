import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { useAuth } from "../AuthContext";
import { useOptions } from "../useCrm";
import { Combo, field, useBillingReload } from "../billing/shared";
import { ENTITY_LINKS, PRIORITIES, type Task } from "./shared";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (days: number, hour = 10) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return toLocal(d); };

const PRESETS = [
  { label: "Сегодня", value: () => at(0, 18) },
  { label: "Завтра", value: () => at(1) },
  { label: "Через 3 дня", value: () => at(3) },
  { label: "Через неделю", value: () => at(7) },
];

type Props = { task?: Task | null; preset?: Partial<Task>; onClose: () => void };

const TaskDialog = ({ task, preset, onClose }: Props) => {
  const { user } = useAuth();
  const { data: opts } = useOptions();
  const reload = useBillingReload();
  const src = task || preset || {};
  const [text, setText] = useState(src.text || "");
  const [details, setDetails] = useState(src.details || "");
  const [due, setDue] = useState(src.due_at ? toLocal(new Date(src.due_at)) : at(1));
  const [priority, setPriority] = useState(src.priority || "normal");
  const [assignee, setAssignee] = useState<number | null>(src.assignee_id ?? user?.id ?? null);
  const [entityType, setEntityType] = useState<string>(src.entity_type || "");
  const [entityId, setEntityId] = useState<number | null>(src.entity_id ?? null);
  const [busy, setBusy] = useState(false);

  const link = ENTITY_LINKS.find((l) => l.value === entityType);
  const entityItems = link ? ((opts?.[link.opt] as { id: number; name: string }[]) || []) : [];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return toast.error("Опишите задачу");
    if (entityType && !entityId) return toast.error(`Выберите: ${link?.label.toLowerCase()}`);
    setBusy(true);
    try {
      const body = {
        text, details, priority, assignee_id: assignee,
        due_at: due ? new Date(due).toISOString() : null,
        entity_type: entityType || null, entity_id: entityType ? entityId : null,
      };
      await api({ resource: "tasks", id: task?.id }, task ? "PUT" : "POST", body);
      toast.success(task ? "Задача обновлена" : "Задача поставлена");
      reload();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{task ? "Задача" : "Новая задача"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Что нужно сделать</span>
            <input value={text} onChange={(e) => setText(e.target.value)} autoFocus required placeholder="Например, «Подготовить договор для партнёра»" className={field} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Подробности</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Необязательно" className={`${field} h-auto py-2`} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="text-sm">
              <span className="mb-1 block font-medium">Исполнитель</span>
              <Combo value={assignee} onChange={setAssignee} items={(opts?.users || []).map((u) => ({ ...u, name: u.id === user?.id ? `${u.name} (я)` : u.name }))} placeholder="Выберите сотрудника" />
            </div>
            <div className="text-sm">
              <span className="mb-1 block font-medium">Приоритет</span>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
                {Object.entries(PRIORITIES).map(([k, p]) => (
                  <button key={k} type="button" onClick={() => setPriority(k as Task["priority"])} className={`rounded-lg py-1.5 text-xs ${priority === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{p.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-sm">
            <span className="mb-1 block font-medium">Срок</span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => setDue(p.value())} className="rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/70">{p.label}</button>
              ))}
              <button type="button" onClick={() => setDue("")} className={`rounded-full px-2.5 py-1 text-xs ${!due ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70"}`}>Без срока</button>
            </div>
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} sm:w-[240px]`} />
          </div>

          <div className="text-sm">
            <span className="mb-1 block font-medium">Привязка</span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => { setEntityType(""); setEntityId(null); }} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${!entityType ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}>
                <Icon name="CircleOff" size={12} />Без привязки
              </button>
              {ENTITY_LINKS.map((l) => (
                <button key={l.value} type="button" onClick={() => { setEntityType(l.value); setEntityId(null); }} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${entityType === l.value ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}>
                  <Icon name={l.icon} size={12} />{l.label}
                </button>
              ))}
            </div>
            {link && <Combo value={entityId} onChange={setEntityId} items={entityItems} placeholder={`Выберите: ${link.label.toLowerCase()}`} />}
          </div>

          <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy && <Icon name="Loader2" size={16} className="animate-spin" />}{task ? "Сохранить" : "Поставить задачу"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;
