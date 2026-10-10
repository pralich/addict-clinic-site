import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { useAuth } from "../AuthContext";
import { fmtDate } from "../config";
import { field, useBillingReload } from "../billing/shared";
import type { Task } from "./shared";

type Comment = { id: number; text: string; created_at: string; user_id: number | null; user_name: string | null };
type Resp = { item: Task & { result_text: string | null }; comments: Comment[] };

export const ResultBlock = ({ task, onDone }: { task: Task & { result_text?: string | null }; onDone?: () => void }) => {
  const reload = useBillingReload();
  const [text, setText] = useState(task.result_text || "");
  const [busy, setBusy] = useState(false);
  const done = !!task.done_at;

  const save = async (complete: boolean | null) => {
    setBusy(true);
    try {
      await api({ resource: "tasks", id: task.id }, "PUT", { result_text: text, ...(complete === null ? {} : { done: complete }) });
      toast.success(complete === true ? "Задача выполнена" : complete === false ? "Задача возвращена в работу" : "Результат сохранён");
      reload();
      if (complete !== null) onDone?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 ${done ? "border-emerald-200 bg-emerald-50/60" : "bg-secondary/40"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon name={done ? "CircleCheckBig" : "ClipboardCheck"} size={16} className={done ? "text-emerald-600" : "text-muted-foreground"} />
          Результат исполнения
        </p>
        {done && <span className="text-xs text-emerald-700">Выполнено {fmtDate(task.done_at!, true)}</span>}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Что сделано, к чему пришли, договорённости…" className={`${field} h-auto bg-card py-2`} />
      <div className="mt-2 flex flex-wrap gap-2">
        {done ? (
          <>
            <button type="button" disabled={busy || text === (task.result_text || "")} onClick={() => save(null)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40">Сохранить результат</button>
            <button type="button" disabled={busy} onClick={() => save(false)} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-card"><Icon name="RotateCcw" size={14} />Вернуть в работу</button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {busy ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Завершить задачу
            </button>
            {text !== (task.result_text || "") && (
              <button type="button" disabled={busy} onClick={() => save(null)} className="inline-flex h-9 items-center rounded-full border px-4 text-sm hover:bg-card">Сохранить черновик</button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const Comments = ({ taskId }: { taskId: number }) => {
  const { user } = useAuth();
  const reload = useBillingReload();
  const { data, isLoading } = useQuery<Resp>({ queryKey: ["crm", "tasks", "item", taskId], queryFn: () => api({ resource: "tasks", id: taskId }) });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const comments = data?.comments ?? [];

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api({ resource: "tasks", action: "comments", id: taskId }, "POST", { text });
      setText("");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (c: Comment) => {
    if (!confirm("Удалить комментарий?")) return;
    await api({ resource: "tasks", action: "comments", id: c.id }, "DELETE").catch((e) => toast.error(e.message));
    reload();
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon name="MessagesSquare" size={16} className="text-muted-foreground" />Комментарии{comments.length ? ` · ${comments.length}` : ""}</p>
      {isLoading ? (
        <p className="py-3 text-sm text-muted-foreground">Загрузка…</p>
      ) : comments.length === 0 ? (
        <p className="pb-3 text-sm text-muted-foreground">Пока нет комментариев — уточните детали или сообщите о ходе работы</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {comments.map((c) => {
            const mine = c.user_id === user?.id;
            return (
              <li key={c.id} className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{(c.user_name || "?").slice(0, 1)}</span>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary/10" : "bg-secondary/70"}`}>
                  <p className="mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{mine ? "Вы" : c.user_name || "—"}</span>
                    <span>{fmtDate(c.created_at, true)}</span>
                    {(mine || user?.role === "admin") && (
                      <button onClick={() => remove(c)} className="opacity-0 hover:text-primary group-hover:opacity-100" aria-label="Удалить"><Icon name="X" size={12} /></button>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{c.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="Написать комментарий…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          className={`${field} h-auto min-h-[40px] resize-y py-2`} />
        <button type="button" onClick={send} disabled={busy || !text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40" aria-label="Отправить">
          {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="SendHorizontal" size={16} />}
        </button>
      </div>
    </div>
  );
};
