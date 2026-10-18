import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { broadcastApi, type Audience, type AudienceCount, type Recipient } from "@/lib/broadcast-api";
import { RELATIONS } from "@/lib/family-api";
import { ROLES } from "../config";

const ACTIVE = [["", "Все"], ["7", "Заходили за 7 дней"], ["30", "За 30 дней"], ["90", "За 90 дней"]] as const;

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card text-muted-foreground hover:border-foreground/30"}`}>{children}</button>
);

const toggle = <T,>(list: T[] = [], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

type Props = { recipients: Recipient[]; onDone: () => void };

const BroadcastForm = ({ recipients, onDone }: Props) => {
  const [mode, setMode] = useState<"mass" | "personal">("mass");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState(() => localInput(new Date(Date.now() + 3600000)));
  const [aud, setAud] = useState<Audience>({ family: { on: true, relations: [], active_days: null, subscribers: false }, staff: { on: false, roles: [] } });
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState<AudienceCount | null>(null);
  const [busy, setBusy] = useState(false);

  const audience: Audience = useMemo(() => {
    if (mode === "mass") return aud;
    const ids = (k: string) => picked.filter((p) => p.startsWith(k)).map((p) => Number(p.split(":")[1]));
    const f = ids("family"), s = ids("staff");
    return { family: { on: f.length > 0, ids: f }, staff: { on: s.length > 0, ids: s } };
  }, [mode, aud, picked]);

  useEffect(() => {
    if (!audience.family.on && !audience.staff.on) { setCount({ family: 0, staff: 0, family_devices: 0, staff_devices: 0 }); return; }
    const h = setTimeout(() => broadcastApi.count(audience).then(setCount).catch(() => setCount(null)), 300);
    return () => clearTimeout(h);
  }, [audience]);

  const list = recipients.filter((r) => !search || `${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase()));
  const total = (count?.family ?? 0) + (count?.staff ?? 0);
  const devices = (count?.family_devices ?? 0) + (count?.staff_devices ?? 0);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Заполните заголовок и текст");
    if (!devices) return toast.error("Нет получателей с включёнными уведомлениями");
    const at = later ? new Date(when) : null;
    if (at && at.getTime() < Date.now() + 60000) return toast.error("Время отправки должно быть в будущем");
    setBusy(true);
    try {
      await broadcastApi.create({ title: title.trim(), body: body.trim(), url: url.trim() || undefined, audience, scheduled_at: at ? at.toISOString() : null });
      toast.success(at ? `Рассылка запланирована на ${at.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}` : "Рассылка отправляется");
      setTitle(""); setBody(""); setUrl(""); setPicked([]); setLater(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5">
        <div className="flex gap-1 self-start rounded-full bg-secondary p-1">
          {([["mass", "Массовая", "Users"], ["personal", "Конкретным людям", "UserCheck"]] as const).map(([k, l, i]) => (
            <button key={k} onClick={() => setMode(k)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ${mode === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
              <Icon name={i} size={14} />{l}
            </button>
          ))}
        </div>

        {mode === "mass" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border p-4">
              <label className="flex items-center gap-3">
                <Icon name="HeartHandshake" size={18} className="text-primary" />
                <span className="flex-1 text-sm font-medium">Родственники из кабинета близких</span>
                <Switch checked={aud.family.on} onCheckedChange={(v) => setAud({ ...aud, family: { ...aud.family, on: v } })} />
              </label>
              {aud.family.on && (
                <div className="mt-4 flex flex-col gap-3 border-t pt-4">
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Кем приходятся пациенту (пусто — все)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(RELATIONS).map(([k, l]) => (
                        <Chip key={k} on={!!aud.family.relations?.includes(k)} onClick={() => setAud({ ...aud, family: { ...aud.family, relations: toggle(aud.family.relations, k) } })}>{l}</Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Активность в кабинете</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIVE.map(([k, l]) => (
                        <Chip key={k} on={String(aud.family.active_days ?? "") === k} onClick={() => setAud({ ...aud, family: { ...aud.family, active_days: k ? Number(k) : null } })}>{l}</Chip>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={!!aud.family.subscribers} onCheckedChange={(v) => setAud({ ...aud, family: { ...aud.family, subscribers: v } })} />
                    Только с действующим платным тарифом
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <label className="flex items-center gap-3">
                <Icon name="UserCog" size={18} className="text-primary" />
                <span className="flex-1 text-sm font-medium">Сотрудники CRM</span>
                <Switch checked={aud.staff.on} onCheckedChange={(v) => setAud({ ...aud, staff: { ...aud.staff, on: v } })} />
              </label>
              {aud.staff.on && (
                <div className="mt-4 border-t pt-4">
                  <p className="mb-1.5 text-xs text-muted-foreground">Роли (пусто — все)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(ROLES).map(([k, l]) => (
                      <Chip key={k} on={!!aud.staff.roles?.includes(k)} onClick={() => setAud({ ...aud, staff: { ...aud.staff, roles: toggle(aud.staff.roles, k) } })}>{l}</Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя или email" className="pl-9" />
            </div>
            <div className="max-h-[320px] divide-y overflow-y-auto rounded-xl border">
              {list.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Нет подписанных на уведомления</p>}
              {list.map((r) => {
                const key = `${r.kind}:${r.id}`;
                const on = picked.includes(key);
                return (
                  <button key={key} onClick={() => setPicked(toggle(picked, key))} className={`flex w-full items-center gap-3 p-3 text-left text-sm ${on ? "bg-primary/5" : "hover:bg-secondary/50"}`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>{on && <Icon name="Check" size={13} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.email}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${r.kind === "family" ? "bg-rose-100 text-rose-800" : "bg-sky-100 text-sky-800"}`}>
                      {r.kind === "family" ? RELATIONS[r.relation || "other"] || "Родственник" : ROLES[r.role || ""] || "Сотрудник"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-5">
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Заголовок</span><span>{title.length}/60</span></div>
            <Input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Вебинар для близких в четверг" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Текст</span><span>{body.length}/200</span></div>
            <Textarea value={body} maxLength={200} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="Коротко и по делу — длинный текст телефон обрежет" />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Ссылка при нажатии (необязательно)</p>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/family?s=events или https://…" />
            <p className="mt-1 text-xs text-muted-foreground">Без ссылки родственник попадёт в свой кабинет, сотрудник — в CRM</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={later} onCheckedChange={setLater} />Отправить позже
          </label>
          {later && <Input type="datetime-local" value={when} min={localInput(new Date())} onChange={(e) => setWhen(e.target.value)} className="w-auto self-start" />}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Получат сообщение</p>
          <p className="mt-1 font-heading text-3xl font-semibold">{total}</p>
          <p className="text-xs text-muted-foreground">
            {count ? `родственников ${count.family} · сотрудников ${count.staff} · устройств ${devices}` : "считаю…"}
          </p>
        </div>
        <div className="rounded-2xl bg-ink p-4 text-ink-foreground">
          <p className="mb-2 text-[11px] uppercase tracking-wider opacity-60">Так увидят на телефоне</p>
          <div className="flex gap-3 rounded-xl bg-white/10 p-3">
            <img src="/admin-192.png" alt="" className="h-9 w-9 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title || "Заголовок уведомления"}</p>
              <p className="line-clamp-3 text-xs opacity-80">{body || "Текст сообщения"}</p>
            </div>
          </div>
        </div>
        <button onClick={submit} disabled={busy || !devices} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Icon name={busy ? "Loader2" : later ? "CalendarClock" : "Send"} size={16} className={busy ? "animate-spin" : ""} />
          {later ? "Запланировать" : "Отправить сейчас"}
        </button>
        <p className="text-xs text-muted-foreground">Сообщение придёт только тем, кто включил уведомления в кабинете близких или в CRM.</p>
      </div>
    </div>
  );
};

export default BroadcastForm;
