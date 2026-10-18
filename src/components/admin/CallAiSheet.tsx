import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import func2url from "../../../backend/func2url.json";
import { getToken } from "@/lib/crm-api";
import Icon from "@/components/ui/icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Proposal = { field: string; label: string; current: string | null; proposed: string; display: string | null };
type Ai = {
  id: number;
  transcript: string | null;
  ai_summary: string | null;
  ai_fields: Proposal[] | null;
  ai_applied_at: string | null;
  lead_id: number | null;
};

const URL = (func2url as Record<string, string>)["call-ai"];

async function callAi<T = { item: Ai }>(action: string, id: number, body?: unknown): Promise<T> {
  if (!URL) throw new Error("ИИ-функция ещё не опубликована");
  const res = await fetch(`${URL}?action=${action}&id=${id}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() || "" },
    body: body === undefined ? undefined : JSON.stringify({ id, ...(body as object) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка ИИ-сервиса");
  return data;
}

type Props = { callId: number; title: string; onClose: () => void; onOpenLead: (id: number) => void };

const CallAiSheet = ({ callId, title, onClose, onOpenLead }: Props) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["call-ai", callId], queryFn: () => callAi("get", callId) });
  const [busy, setBusy] = useState<"" | "transcribe" | "analyze" | "apply">("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [withSummary, setWithSummary] = useState(true);
  const [showText, setShowText] = useState(false);
  const ai = data?.item;

  useEffect(() => {
    const p: Record<string, boolean> = {};
    const v: Record<string, string> = {};
    (ai?.ai_fields || []).forEach((f) => { p[f.field] = true; v[f.field] = f.proposed; });
    setPicked(p);
    setValues(v);
  }, [ai?.ai_fields]);

  const run = async (action: "transcribe" | "analyze") => {
    setBusy(action);
    try {
      let r = await callAi(action, callId, {});
      if (action === "transcribe") {
        qc.setQueryData(["call-ai", callId], r);
        r = await callAi("analyze", callId, {});
      }
      qc.setQueryData(["call-ai", callId], r);
      qc.invalidateQueries({ queryKey: ["crm", "calls"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const apply = async () => {
    const fields = Object.fromEntries(Object.entries(picked).filter(([, on]) => on).map(([k]) => [k, values[k]]));
    setBusy("apply");
    try {
      const r = await callAi<{ item: Ai; lead_id: number }>("apply", callId, { fields, summary: withSummary });
      qc.setQueryData(["call-ai", callId], { item: r.item });
      qc.invalidateQueries({ queryKey: ["crm"] });
      toast.success(ai?.lead_id ? "Лид обновлён" : "Лид создан по звонку", { action: { label: "Открыть", onClick: () => onOpenLead(r.lead_id) } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const fields = ai?.ai_fields || [];
  const chosen = Object.values(picked).filter(Boolean).length;

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Icon name="Sparkles" size={13} />ИИ-разбор звонка</p>
          <SheetTitle className="text-lg">{title}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : !ai?.transcript ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center">
            <Icon name="AudioLines" size={28} className="text-primary" />
            <p className="max-w-sm text-sm text-muted-foreground">ИИ расшифрует запись, составит краткое резюме и предложит, какие поля лида заполнить. Ничего не изменится без вашего одобрения.</p>
            <button onClick={() => run("transcribe")} disabled={!!busy} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              <Icon name={busy ? "Loader2" : "Sparkles"} size={15} className={busy ? "animate-spin" : ""} />
              {busy === "transcribe" ? "Расшифровываю…" : busy === "analyze" ? "Составляю резюме…" : "Расшифровать и разобрать"}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Резюме</p>
                <button onClick={() => run("analyze")} disabled={!!busy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                  <Icon name="RefreshCw" size={12} className={busy === "analyze" ? "animate-spin" : ""} />{ai.ai_summary ? "Пересоставить" : "Составить"}
                </button>
              </div>
              {busy === "analyze" ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon name="Loader2" size={14} className="animate-spin" />ИИ анализирует разговор…</p>
              ) : ai.ai_summary ? (
                <p className="whitespace-pre-line text-sm leading-relaxed">{ai.ai_summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Резюме ещё не составлено</p>
              )}
            </section>

            {ai.ai_summary && busy !== "analyze" && (
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {ai.lead_id ? "Предлагаемые изменения в лиде" : "Новый лид по этому звонку"}
                </p>
                <div className="divide-y rounded-xl border bg-card">
                  <label className="flex cursor-pointer items-start gap-3 p-3">
                    <Checkbox checked={withSummary} onCheckedChange={(v) => setWithSummary(!!v)} className="mt-0.5" />
                    <div className="text-sm"><p className="font-medium">Добавить резюме в историю лида</p><p className="text-xs text-muted-foreground">Появится в ленте событий как запись о звонке</p></div>
                  </label>
                  {fields.length === 0 && <p className="p-3 text-sm text-muted-foreground">Новых данных для полей лида в разговоре не нашлось</p>}
                  {fields.map((f) => (
                    <div key={f.field} className="flex items-start gap-3 p-3">
                      <Checkbox checked={!!picked[f.field]} onCheckedChange={(v) => setPicked({ ...picked, [f.field]: !!v })} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                        {f.current && <p className="mt-0.5 truncate text-xs text-muted-foreground line-through">{f.current}</p>}
                        {f.field === "status" || f.field === "rep_relation" ? (
                          <p className="mt-0.5 text-sm font-medium">{f.display || f.proposed}</p>
                        ) : (
                          <textarea value={values[f.field] ?? ""} onChange={(e) => setValues({ ...values, [f.field]: e.target.value })} rows={f.field === "message" || f.field === "rep_note" ? 2 : 1}
                            className="mt-1 w-full resize-y rounded-md border bg-background px-2 py-1 text-sm outline-none focus:border-foreground/30" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {ai.ai_applied_at ? <span className="flex items-center gap-1 text-emerald-700"><Icon name="CircleCheck" size={13} />Уже применялось к лиду</span> : "Проверьте значения перед применением"}
                  </p>
                  <div className="flex gap-2">
                    {ai.lead_id && <button onClick={() => onOpenLead(ai.lead_id!)} className="rounded-full bg-secondary px-4 py-2 text-sm hover:bg-secondary/70">Открыть лид</button>}
                    <button onClick={apply} disabled={!!busy || (!chosen && !withSummary)} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                      <Icon name={busy === "apply" ? "Loader2" : "Check"} size={15} className={busy === "apply" ? "animate-spin" : ""} />
                      {ai.lead_id ? `Одобрить${chosen ? ` (${chosen})` : ""}` : "Создать лид"}
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section>
              <button onClick={() => setShowText(!showText)} className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                <Icon name={showText ? "ChevronDown" : "ChevronRight"} size={14} />Расшифровка
              </button>
              {showText && (
                <div className="mt-2 rounded-xl bg-secondary/60 p-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed">{ai.transcript}</p>
                  <div className="mt-3 flex gap-4">
                    <button onClick={() => navigator.clipboard.writeText(ai.transcript!).then(() => toast.success("Скопировано"))} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Icon name="Copy" size={12} />Копировать</button>
                    <button onClick={() => run("transcribe")} disabled={!!busy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"><Icon name="RefreshCw" size={12} className={busy === "transcribe" ? "animate-spin" : ""} />Расшифровать заново</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CallAiSheet;
