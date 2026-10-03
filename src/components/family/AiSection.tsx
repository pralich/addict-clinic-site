import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { aiApi, fmtDateTime, type AiMessage } from "@/lib/family-api";
import { AI_MODES, ROLEPLAY_ISSUE, ROLEPLAY_WHO, modeById, type AiMode } from "./ai-modes";
import AiMarkdown from "./AiMarkdown";
import { useFamilyAuth } from "./FamilyAuth";

type Setup = { who: string; issue: string; resistance: string; context: string };

const RoleplaySetup = ({ onStart, onBack }: { onStart: (s: Setup) => void; onBack: () => void }) => {
  const [s, setS] = useState<Setup>({ who: "Муж", issue: "Алкоголь", resistance: "medium", context: "" });
  const chip = (active: boolean) => `rounded-full px-3 py-1.5 text-sm transition-colors ${active ? "bg-ink text-ink-foreground" : "bg-secondary hover:bg-secondary/70"}`;
  return (
    <div className="mx-auto max-w-[640px] rounded-2xl bg-card p-6 md:p-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Icon name="ArrowLeft" size={15} />Назад</button>
      <h3 className="font-heading text-2xl font-semibold tracking-tight">Настройте тренировку</h3>
      <p className="mt-1 text-muted-foreground">ИИ сыграет вашего близкого максимально реалистично. Это безопасная репетиция — ошибаться можно.</p>
      <p className="mb-2 mt-6 text-sm font-medium">С кем разговор</p>
      <div className="flex flex-wrap gap-1.5">{ROLEPLAY_WHO.map((w) => <button key={w} onClick={() => setS({ ...s, who: w })} className={chip(s.who === w)}>{w}</button>)}</div>
      <p className="mb-2 mt-5 text-sm font-medium">Зависимость</p>
      <div className="flex flex-wrap gap-1.5">{ROLEPLAY_ISSUE.map((w) => <button key={w} onClick={() => setS({ ...s, issue: w })} className={chip(s.issue === w)}>{w}</button>)}</div>
      <p className="mb-2 mt-5 text-sm font-medium">Насколько сложно</p>
      <div className="grid grid-cols-3 gap-2">
        {[["low", "Легко", "Сам сомневается"], ["medium", "Средне", "Отрицает, раздражается"], ["high", "Сложно", "Агрессивно отрицает"]].map(([k, l, d]) => (
          <button key={k} onClick={() => setS({ ...s, resistance: k })} className={`rounded-xl border p-3 text-left transition-colors ${s.resistance === k ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}>
            <p className="text-sm font-semibold">{l}</p><p className="text-xs text-muted-foreground">{d}</p>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-5 text-sm font-medium">Детали (необязательно)</p>
      <textarea value={s.context} onChange={(e) => setS({ ...s, context: e.target.value })} rows={3} placeholder="Например: 45 лет, пьёт по вечерам 3 года, на работе пока не знают, обещал бросить после Нового года"
        className="w-full rounded-xl border bg-background p-3 text-sm outline-none focus:border-foreground/30" />
      <button onClick={() => onStart(s)} className="accent-glow mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground">
        <Icon name="Play" size={16} />Начать тренировку
      </button>
    </div>
  );
};

const Chat = ({ mode, chatId, setup, onExit, onCreated }: { mode: AiMode; chatId: number | null; setup?: Setup; onExit: () => void; onCreated: (id: number) => void }) => {
  const { user } = useFamilyAuth();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!chatId);
  const [id, setId] = useState<number | null>(chatId);
  const end = useRef<HTMLDivElement>(null);
  const isRole = mode.id === "roleplay";
  const who = setup?.who;

  useEffect(() => {
    if (!chatId) return;
    aiApi.chat(chatId).then((r) => setMessages(r.messages)).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [chatId]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  const send = async (msg: string) => {
    const m = msg.trim();
    if (!m || busy) return;
    setText("");
    const temp: AiMessage = { id: -Date.now(), role: "user", content: m, created_at: new Date().toISOString() };
    setMessages((p) => [...p, temp]);
    setBusy(true);
    try {
      const r = await aiApi.send({ message: m, mode: mode.id, settings: setup as unknown as Record<string, string> }, id ?? undefined);
      if (!id) { setId(r.chat.id); onCreated(r.chat.id); }
      setMessages((p) => [...p, r.message]);
    } catch (e) {
      setMessages((p) => p.filter((x) => x.id !== temp.id));
      setText(m);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const feedback = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const r = await aiApi.feedback(id);
      setMessages((p) => [...p, r.message]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };
  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl bg-card lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button onClick={onExit} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Назад"><Icon name="ArrowLeft" size={18} /></button>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white ${mode.color}`}><Icon name={mode.icon} size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{mode.title}</p>
          <p className="truncate text-xs text-muted-foreground">{isRole && setup ? `ИИ в роли: ${setup.who.toLowerCase()}, ${setup.issue.toLowerCase()}` : "ИИ-психолог · отвечает за несколько секунд"}</p>
        </div>
        {isRole && userTurns >= 2 && (
          <button onClick={feedback} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-medium text-ink-foreground disabled:opacity-50">
            <Icon name="ClipboardCheck" size={15} /><span className="hidden sm:inline">Получить разбор</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-secondary/30 px-4 py-5 md:px-8">
        <div className="mx-auto flex max-w-[760px] flex-col gap-4">
          <div className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><Icon name="Info" size={15} className="text-primary" />{mode.intro}</p>
            {messages.length === 0 && !loading && (
              <div className="mt-3 flex flex-wrap gap-2">
                {mode.starters.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-foreground hover:border-primary/40 hover:text-primary">{s}</button>
                ))}
              </div>
            )}
          </div>
          {loading && <div className="h-24 animate-pulse rounded-2xl bg-card" />}
          {messages.map((m) => {
            if (m.role === "feedback") {
              return (
                <div key={m.id} className="rounded-2xl border-2 border-primary/20 bg-card p-5">
                  <p className="mb-3 flex items-center gap-2 font-heading font-semibold"><Icon name="ClipboardCheck" size={18} className="text-primary" />Разбор вашего разговора</p>
                  <div className="text-[0.95em]"><AiMarkdown text={m.content} /></div>
                </div>
              );
            }
            const mine = m.role === "user";
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
                {!mine && (
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${isRole ? "bg-neutral-500" : `bg-gradient-to-br ${mode.color}`}`}>
                    {isRole ? (who || "?").slice(0, 1) : <Icon name="Sparkles" size={14} />}
                  </span>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[0.95em] ${mine ? "rounded-br-md bg-ink text-ink-foreground" : "rounded-bl-md bg-card shadow-sm"}`}>
                  {mine ? <p className="whitespace-pre-line">{m.content}</p> : <AiMarkdown text={m.content} />}
                </div>
                {mine && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{user?.name.slice(0, 1)}</span>}
              </div>
            );
          })}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-1"><i className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" /><i className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:.15s]" /><i className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:.3s]" /></span>
              {isRole ? `${who} думает…` : "ИИ-психолог пишет…"}
            </div>
          )}
          <div ref={end} />
        </div>
      </div>

      <form onSubmit={submit} className="border-t bg-card p-3">
        <div className="mx-auto flex max-w-[760px] items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
            rows={1}
            placeholder={isRole ? `Что вы скажете? (${who?.toLowerCase()} слушает)` : "Напишите сообщение…"}
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 text-[0.95em] outline-none focus:border-foreground/30"
          />
          <button disabled={busy || !text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40" aria-label="Отправить">
            <Icon name="ArrowUp" size={18} />
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-[760px] text-center text-[11px] text-muted-foreground">
          ИИ не заменяет специалиста. При угрозе жизни звоните 112 или <a href={PHONE_HREF} className="underline">{PHONE_DISPLAY}</a> (24/7).
        </p>
      </form>
    </div>
  );
};

const AiSection = () => {
  const qc = useQueryClient();
  const { refresh } = useFamilyAuth();
  const { data: status } = useQuery({ queryKey: ["family", "ai-status"], queryFn: aiApi.status, staleTime: 60000 });
  const { data } = useQuery({ queryKey: ["family", "ai-chats"], queryFn: aiApi.chats });
  const [view, setView] = useState<{ type: "home" } | { type: "setup" } | { type: "chat"; mode: AiMode; id: number | null; setup?: Setup }>({ type: "home" });
  const chats = data?.items ?? [];

  const exit = () => { setView({ type: "home" }); qc.invalidateQueries({ queryKey: ["family", "ai-chats"] }); refresh(); };
  const remove = async (id: number) => { await aiApi.remove(id).catch(() => null); qc.invalidateQueries({ queryKey: ["family", "ai-chats"] }); };

  if (view.type === "setup") return <RoleplaySetup onBack={() => setView({ type: "home" })} onStart={(s) => setView({ type: "chat", mode: modeById("roleplay"), id: null, setup: s })} />;
  if (view.type === "chat") return <Chat mode={view.mode} chatId={view.id} setup={view.setup} onExit={exit} onCreated={() => qc.invalidateQueries({ queryKey: ["family", "ai-chats"] })} />;

  const open = (m: AiMode) => (m.id === "roleplay" ? setView({ type: "setup" }) : setView({ type: "chat", mode: m, id: null }));

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-ink-foreground md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-60 w-60 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="relative max-w-[640px]">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"><Icon name="Sparkles" size={13} />Инновационный раздел</p>
          <h2 className="mt-4 font-heading text-[1.9em] font-semibold leading-tight tracking-[-0.03em]">ИИ-психолог для близких</h2>
          <p className="mt-2 text-white/70">Отрепетируйте трудный разговор, подберите правильные слова, составьте письмо и план действий. Доступно 24/7, конфиденциально. Методики основаны на подходе CRAFT и мотивационном интервьюировании.</p>
        </div>
      </div>

      {status && !status.enabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <Icon name="Wrench" size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <p>ИИ-психолог подключается и скоро заработает. Пока задайте вопрос живому специалисту в разделе «Вопрос психологу».</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AI_MODES.map((m, i) => (
          <button key={m.id} onClick={() => open(m)} className={`group relative flex flex-col overflow-hidden rounded-2xl bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${i === 0 ? "sm:col-span-2 xl:col-span-1 xl:row-span-2" : ""}`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white ${m.color}`}><Icon name={m.icon} size={20} /></span>
            {i === 0 && <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">Популярное</span>}
            <p className="mt-4 font-heading text-lg font-semibold">{m.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.short}</p>
            {i === 0 && (
              <div className="mt-5 hidden flex-col gap-2 xl:flex">
                <div className="w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-xs text-ink-foreground self-end">Я переживаю за тебя…</div>
                <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-xs">Опять начинаешь? У меня всё нормально.</div>
                <div className="w-fit max-w-[90%] rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs"><b>Разбор: 7/10.</b> Хорошее «я-сообщение». Попробуйте…</div>
              </div>
            )}
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">Начать<Icon name="ArrowRight" size={14} className="transition-transform group-hover:translate-x-1" /></span>
          </button>
        ))}
      </div>

      {chats.length > 0 && (
        <div>
          <h3 className="mb-3 font-heading text-lg font-semibold">История</h3>
          <div className="flex flex-col gap-2">
            {chats.map((c) => {
              const m = modeById(c.mode);
              const setup = c.settings ? (JSON.parse(c.settings) as Setup) : undefined;
              return (
                <div key={c.id} className="group flex items-center gap-3 rounded-xl bg-card p-3">
                  <button onClick={() => setView({ type: "chat", mode: m, id: c.id, setup: setup?.who ? setup : undefined })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${m.color}`}><Icon name={m.icon} size={16} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.last_message?.slice(0, 90) || m.title}</span>
                    </span>
                  </button>
                  <span className="hidden text-xs text-muted-foreground sm:block">{fmtDateTime(c.updated_at)}</span>
                  <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-muted-foreground opacity-60 hover:bg-secondary hover:text-primary group-hover:opacity-100" aria-label="Удалить"><Icon name="Trash2" size={15} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiSection;
