import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { dayDiffMsk } from "@/lib/msk";
import { CONDITIONS, PATIENT_STATUS, partnerApi, type Patient } from "@/lib/partner-api";
import PatientForm from "./PatientForm";
import PatientNotes from "./PatientNotes";
import { Badge, Empty, Loading, Row, d } from "./ui";

const FILTERS = [["active", "Сейчас"], ["admitted", "На лечении"], ["expected", "Ожидаются"], ["discharged", "Выписаны"], ["interrupted", "Прервали"], ["", "Все"]] as const;

const daysIn = (p: Patient) => (p.admitted_at && p.status === "admitted" ? Math.max(0, -dayDiffMsk(`${p.admitted_at}T12:00:00Z`)) + 1 : null);
const daysLeft = (p: Patient) => (p.planned_discharge && p.status === "admitted" ? dayDiffMsk(`${p.planned_discharge}T12:00:00Z`) : null);

export const PatientSheet = ({ id, onClose }: { id: number; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["partner", "patient", id], queryFn: () => partnerApi.patient(id) });
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState("");
  const [cond, setCond] = useState("");
  const [busy, setBusy] = useState(false);
  const p = data?.item;

  const addNote = async () => {
    setBusy(true);
    try {
      const r = await partnerApi.addNote(id, text, cond || undefined);
      qc.setQueryData(["partner", "patient", id], { ...data, notes: r.notes, item: { ...p, condition: cond || p?.condition } });
      qc.invalidateQueries({ queryKey: ["partner", "patients"] });
      qc.invalidateQueries({ queryKey: ["partner", "overview"] });
      setText("");
      setCond("");
      toast.success("Запись добавлена");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet open={!edit} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Пациент</p>
            <SheetTitle>{p?.full_name || "…"}</SheetTitle>
          </SheetHeader>
          {!p ? <Loading /> : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge map={PATIENT_STATUS} value={p.status} />
                <Badge map={CONDITIONS} value={p.condition} />
                <button onClick={() => setEdit(true)} className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/70"><Icon name="Pencil" size={14} />Изменить</button>
              </div>
              <dl className="mt-4 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
                <Row label="Поступил">{p.admitted_at && `${d(p.admitted_at)}${daysIn(p) ? ` · ${daysIn(p)}-й день` : ""}`}</Row>
                <Row label="Плановая выписка">{p.planned_discharge && `${d(p.planned_discharge)}${daysLeft(p) != null ? ` · через ${daysLeft(p)} дн.` : ""}`}</Row>
                <Row label="Выписан">{p.discharged_at && d(p.discharged_at)}</Row>
                <Row label="Программа">{p.program}</Row>
                <Row label="Врач">{p.doctor}</Row>
                <Row label="Палата">{p.room}</Row>
                <Row label="Дата рождения">{p.birth_date && d(p.birth_date)}</Row>
                <Row label="Телефон">{p.phone && <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>}</Row>
                <Row label="Контактное лицо">{p.rep_name && `${p.rep_name}${p.rep_phone ? `, ${p.rep_phone}` : ""}`}</Row>
                <Row label="Диагноз"><span className="whitespace-pre-line">{p.diagnosis}</span></Row>
                <Row label="Заметки"><span className="whitespace-pre-line">{p.notes}</span></Row>
                <Row label="Сделка клиники">{p.deal_title}</Row>
              </dl>

              <div className="mt-6 rounded-2xl border bg-card p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Дневник лечения</p>
                <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Как прошёл день: самочувствие, процедуры, настроение, посещения" />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {Object.entries(CONDITIONS).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setCond(cond === k ? "" : k)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${cond === k ? v.cls + " ring-2 ring-foreground/20" : "bg-secondary text-muted-foreground"}`}>{v.label}</button>
                  ))}
                  <button disabled={busy || !text.trim()} onClick={addNote}
                    className="ml-auto rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Добавить</button>
                </div>
              </div>
              <div className="mt-4"><PatientNotes notes={data.notes} /></div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {edit && p && <PatientForm patient={p} onClose={() => setEdit(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["partner", "patient", id] })} />}
    </>
  );
};

const PartnerPatients = () => {
  const [status, setStatus] = useState("active");
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["partner", "patients", status], queryFn: () => partnerApi.patients(status) });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-full bg-secondary p-1 [scrollbar-width:none]">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${status === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:ml-auto">
          <Icon name="UserPlus" size={15} />Добавить пациента
        </button>
      </div>
      {isLoading ? <Loading /> : !data?.items.length ? <Empty icon="BedDouble" text="Пациентов в этом списке нет" /> : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((p) => {
            const left = daysLeft(p);
            const stale = p.status === "admitted" && (!p.last_note_at || Date.now() - new Date(p.last_note_at.endsWith("Z") ? p.last_note_at : `${p.last_note_at}Z`).getTime() > 864e5);
            return (
              <button key={p.id} onClick={() => setOpen(p.id)} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{p.full_name}</p>
                  <Badge map={PATIENT_STATUS} value={p.status} />
                </div>
                <p className="text-sm text-muted-foreground">{p.program || "Программа не указана"}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {p.admitted_at && <span className="flex items-center gap-1"><Icon name="LogIn" size={12} />{d(p.admitted_at)}</span>}
                  {(p.discharged_at || p.planned_discharge) && <span className="flex items-center gap-1"><Icon name="LogOut" size={12} />{d(p.discharged_at || p.planned_discharge)}</span>}
                  {left != null && <span className={left <= 2 ? "font-medium text-amber-700" : ""}>· осталось {Math.max(0, left)} дн.</span>}
                  <Badge map={CONDITIONS} value={p.condition} />
                </div>
                {stale && <p className="flex items-center gap-1 text-xs font-medium text-amber-700"><Icon name="CircleAlert" size={12} />Нет записи в дневнике за сутки</p>}
              </button>
            );
          })}
        </div>
      )}
      {open && <PatientSheet id={open} onClose={() => setOpen(null)} />}
      {creating && <PatientForm onClose={() => setCreating(false)} onSaved={(p) => setOpen(p.id)} />}
    </div>
  );
};

export default PartnerPatients;
