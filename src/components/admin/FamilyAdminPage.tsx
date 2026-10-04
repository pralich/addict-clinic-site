import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { familyAdminApi, fmtDateTime, RELATIONS, type FamilyEvent, type Question } from "@/lib/family-api";

const TABS = [
  { id: "questions", label: "Вопросы", icon: "MessageCircleQuestion" },
  { id: "events", label: "События", icon: "CalendarHeart" },
  { id: "users", label: "Родственники", icon: "Users" },
];

const QuestionCard = ({ q, onDone }: { q: Question; onDone: () => void }) => {
  const [open, setOpen] = useState(q.status === "new");
  const [answer, setAnswer] = useState(q.answer || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await familyAdminApi.answer(q.id, answer);
      toast.success("Ответ отправлен в кабинет");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${q.status === "new" ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-800"}`}>{q.status === "new" ? "Ждёт ответа" : "Отвечен"}</span>
        {q.topic && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{q.topic}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(q.created_at)}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        <b className="text-foreground">{q.user_name}</b> · {RELATIONS[q.user_relation || "other"]} · {q.user_email}{q.user_phone ? ` · ${q.user_phone}` : ""}
      </p>
      <p className="mt-3 whitespace-pre-line">{q.question}</p>
      {open ? (
        <div className="mt-4">
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder="Ответ психолога — появится в кабинете родственника" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy || !answer.trim()} onClick={save}><Icon name="Send" size={14} className="mr-1.5" />{q.status === "new" ? "Ответить" : "Обновить ответ"}</Button>
            {q.status !== "new" && <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm">
          <p className="mb-1 text-xs text-muted-foreground">{q.answered_by_name} · {fmtDateTime(q.answered_at)}</p>
          <p className="whitespace-pre-line">{q.answer}</p>
          <button onClick={() => setOpen(true)} className="mt-2 text-xs font-medium text-primary">Изменить ответ</button>
        </div>
      )}
    </div>
  );
};

const Questions = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState("new");
  const { data, isLoading } = useQuery({ queryKey: ["crm", "family-q", status], queryFn: () => familyAdminApi.questions(status) });
  const items = data?.items ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {[["new", "Ждут ответа"], ["answered", "Отвеченные"], ["", "Все"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-4 py-1.5 text-sm ${status === k ? "bg-ink text-ink-foreground" : "border bg-card"}`}>{l}</button>
        ))}
      </div>
      {isLoading && <p className="py-8 text-center text-muted-foreground">Загрузка…</p>}
      {!isLoading && items.length === 0 && <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">Вопросов нет</p>}
      {items.map((q) => <QuestionCard key={`${q.id}-${q.status}`} q={q} onDone={() => qc.invalidateQueries({ queryKey: ["crm", "family-q"] })} />)}
    </div>
  );
};

const EMPTY: Partial<FamilyEvent> = { title: "", kind: "webinar", starts_at: "", duration_min: 90, description: "", host: "", location: "", link: "", capacity: null };

const EventForm = ({ ev, onClose }: { ev: Partial<FamilyEvent>; onClose: (saved: boolean) => void }) => {
  const [f, setF] = useState<Partial<FamilyEvent>>({ ...ev, starts_at: ev.starts_at ? ev.starts_at.slice(0, 16) : "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof FamilyEvent, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const { title, kind, starts_at, duration_min, description, host, location, link, capacity } = f;
      await familyAdminApi.saveEvent({ title, kind, starts_at, duration_min: Number(duration_min) || 90, description, host, location, link, capacity: capacity ? Number(capacity) : null }, ev.id);
      toast.success("Событие сохранено");
      onClose(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {(["webinar", "offline"] as const).map((k) => (
          <button key={k} onClick={() => set("kind", k)} className={`rounded-lg border p-2.5 text-sm ${f.kind === k ? "border-primary bg-primary/5 font-medium" : ""}`}>{k === "webinar" ? "Онлайн-вебинар" : "Офлайн-встреча"}</button>
        ))}
      </div>
      <Input value={f.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Название" />
      <Textarea value={f.description || ""} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Описание" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Дата и время<Input type="datetime-local" value={f.starts_at || ""} onChange={(e) => set("starts_at", e.target.value)} className="mt-1" /></label>
        <label className="text-xs text-muted-foreground">Длительность, мин<Input type="number" value={f.duration_min || ""} onChange={(e) => set("duration_min", e.target.value)} className="mt-1" /></label>
      </div>
      <Input value={f.host || ""} onChange={(e) => set("host", e.target.value)} placeholder="Ведущий" />
      {f.kind === "offline" ? (
        <>
          <Input value={f.location || ""} onChange={(e) => set("location", e.target.value)} placeholder="Место (точный адрес в скобках увидят только записавшиеся)" />
          <Input type="number" value={f.capacity || ""} onChange={(e) => set("capacity", e.target.value)} placeholder="Количество мест" />
        </>
      ) : (
        <Input value={f.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="Ссылка на эфир (увидят только записавшиеся)" />
      )}
      <Button disabled={busy} onClick={save}>{ev.id ? "Сохранить" : "Создать событие"}</Button>
    </div>
  );
};

const Events = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["crm", "family-ev"], queryFn: familyAdminApi.events });
  const [edit, setEdit] = useState<Partial<FamilyEvent> | null>(null);
  const [regsOf, setRegsOf] = useState<FamilyEvent | null>(null);
  const { data: regs } = useQuery({ queryKey: ["crm", "family-regs", regsOf?.id], queryFn: () => familyAdminApi.eventRegs(regsOf!.id), enabled: !!regsOf });
  const items = data?.items ?? [];
  const reload = () => qc.invalidateQueries({ queryKey: ["crm", "family-ev"] });

  return (
    <div className="flex flex-col gap-3">
      <div><Button size="sm" className="rounded-full" onClick={() => setEdit(EMPTY)}><Icon name="Plus" size={14} className="mr-1.5" />Новое событие</Button></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Событие</TableHead><TableHead>Формат</TableHead><TableHead className="text-center">Записались</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id} className={new Date(e.starts_at) < new Date() ? "opacity-50" : ""}>
                <TableCell className="whitespace-nowrap">{fmtDateTime(e.starts_at)}</TableCell>
                <TableCell className="font-medium">{e.title}</TableCell>
                <TableCell>{e.kind === "offline" ? "Офлайн" : "Вебинар"}</TableCell>
                <TableCell className="text-center">
                  <button onClick={() => setRegsOf(e)} className="font-medium text-primary underline-offset-2 hover:underline">{e.regs}{e.capacity ? ` / ${e.capacity}` : ""}</button>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEdit(e)}><Icon name="Pencil" size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={async () => { await familyAdminApi.archiveEvent(e.id); reload(); }}><Icon name="Archive" size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Событий нет</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Редактировать событие" : "Новое событие"}</DialogTitle></DialogHeader>
          {edit && <EventForm ev={edit} onClose={(s) => { setEdit(null); if (s) reload(); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!regsOf} onOpenChange={(o) => !o && setRegsOf(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Записались: {regsOf?.title}</DialogTitle></DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {(regs?.items ?? []).map((r, i) => (
              <div key={i} className="rounded-lg bg-secondary/50 p-3 text-sm">
                <p className="font-medium">{r.name} <span className="font-normal text-muted-foreground">· {RELATIONS[r.relation || "other"]}</span></p>
                <p className="text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
              </div>
            ))}
            {regs && regs.items.length === 0 && <p className="py-6 text-center text-muted-foreground">Пока никто не записался</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Users = () => {
  const { data } = useQuery({ queryKey: ["crm", "family-users"], queryFn: familyAdminApi.users });
  const items = data?.items ?? [];
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Имя</TableHead><TableHead>Кем приходится</TableHead><TableHead>Контакты</TableHead><TableHead className="text-center">Вопросы</TableHead><TableHead className="text-center">События</TableHead><TableHead className="text-center">ИИ-диалоги</TableHead><TableHead>Регистрация</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{RELATIONS[u.relation || "other"]}</TableCell>
              <TableCell className="text-sm">{u.email}{u.phone && <span className="block text-muted-foreground">{u.phone}</span>}</TableCell>
              <TableCell className="text-center">{u.questions}</TableCell>
              <TableCell className="text-center">{u.events}</TableCell>
              <TableCell className="text-center">{u.ai_chats}</TableCell>
              <TableCell className="whitespace-nowrap">{fmtDateTime(u.created_at)}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Пока никто не зарегистрировался</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
};

const FamilyAdminPage = ({ section }: { section?: string }) => {
  const [own, setTab] = useState("questions");
  const tab = section || own;
  const { data: s } = useQuery({ queryKey: ["crm", "family-stats"], queryFn: familyAdminApi.stats });
  const kpi = [
    { label: "Родственников", value: s?.users, icon: "Users" },
    { label: "Ждут ответа", value: s?.new_questions, icon: "MessageCircleQuestion", accent: !!s?.new_questions },
    { label: "Ближайших событий", value: s?.upcoming, icon: "CalendarHeart" },
    { label: "Диалогов с ИИ", value: s?.ai_chats, icon: "Sparkles" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Кабинет близких</h1>
          <p className="text-sm text-muted-foreground">Вопросы родственников, события и участники</p>
        </div>
        <a href="/family" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary"><Icon name="ExternalLink" size={14} />Открыть кабинет</a>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi.map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.accent ? "border-primary/30 bg-primary/5" : "bg-card"}`}>
            <Icon name={k.icon} size={18} className={k.accent ? "text-primary" : "text-muted-foreground"} />
            <p className="mt-2 font-heading text-2xl font-semibold">{k.value ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>
      <div className={`flex gap-1 border-b ${section ? "hidden" : ""}`}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm ${tab === t.id ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}>
            <Icon name={t.icon} size={15} />{t.label}
          </button>
        ))}
      </div>
      {tab === "questions" && <Questions />}
      {tab === "events" && <Events />}
      {tab === "users" && <Users />}
    </div>
  );
};

export default FamilyAdminPage;
