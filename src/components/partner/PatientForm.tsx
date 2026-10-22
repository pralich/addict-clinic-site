import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import { CONDITIONS, PATIENT_STATUS, partnerApi, type Patient } from "@/lib/partner-api";

type Props = { patient?: Patient | null; dealId?: number | null; dealTitle?: string; onClose: () => void; onSaved?: (p: Patient) => void };

const F = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={`flex flex-col gap-1 text-sm ${wide ? "sm:col-span-2" : ""}`}><span className="text-xs text-muted-foreground">{label}</span>{children}</label>
);

const sel = "h-10 rounded-md border bg-background px-3 text-sm";

const PatientForm = ({ patient, dealId, dealTitle, onClose, onSaved }: Props) => {
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<Patient>>(() => patient ? { ...patient } : { status: "admitted" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Patient) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const fromDeal = !patient && !!dealId;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const keys: (keyof Patient)[] = ["full_name", "birth_date", "phone", "rep_name", "rep_phone", "program", "status", "admitted_at", "planned_discharge", "discharged_at", "room", "doctor", "diagnosis", "condition", "notes"];
      const body: Record<string, unknown> = Object.fromEntries(keys.filter((k) => f[k] !== undefined && (!fromDeal || f[k] !== "")).map((k) => [k, f[k] ?? ""]));
      if (fromDeal) body.deal_id = dealId;
      const r = await partnerApi.savePatient(patient?.id ?? null, body);
      qc.invalidateQueries({ queryKey: ["partner"] });
      toast.success(patient ? "Данные пациента обновлены" : "Пациент добавлен");
      onSaved?.(r.item);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{patient ? "Данные пациента" : "Новый пациент"}</SheetTitle>
          {fromDeal && <p className="text-sm text-muted-foreground">По сделке «{dealTitle}». Пустые поля заполнятся из данных клиники.</p>}
        </SheetHeader>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <F label="ФИО или псевдоним *" wide><Input value={f.full_name ?? ""} onChange={(e) => set("full_name")(e.target.value)} required={!fromDeal} /></F>
          <F label="Статус">
            <select value={f.status ?? "admitted"} onChange={(e) => set("status")(e.target.value)} className={sel}>
              {Object.entries(PATIENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </F>
          <F label="Состояние">
            <select value={f.condition ?? ""} onChange={(e) => set("condition")(e.target.value)} className={sel}>
              <option value="">Не указано</option>
              {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </F>
          <F label="Дата поступления"><Input type="date" value={f.admitted_at ?? ""} onChange={(e) => set("admitted_at")(e.target.value)} /></F>
          <F label="Плановая выписка"><Input type="date" value={f.planned_discharge ?? ""} onChange={(e) => set("planned_discharge")(e.target.value)} /></F>
          {(f.status === "discharged" || f.status === "interrupted") && (
            <F label="Фактическая выписка"><Input type="date" value={f.discharged_at ?? ""} onChange={(e) => set("discharged_at")(e.target.value)} /></F>
          )}
          <F label="Программа лечения"><Input value={f.program ?? ""} onChange={(e) => set("program")(e.target.value)} placeholder="Реабилитация 28 дней" /></F>
          <F label="Лечащий врач"><Input value={f.doctor ?? ""} onChange={(e) => set("doctor")(e.target.value)} /></F>
          <F label="Палата / корпус"><Input value={f.room ?? ""} onChange={(e) => set("room")(e.target.value)} /></F>
          <F label="Дата рождения"><Input type="date" value={f.birth_date ?? ""} onChange={(e) => set("birth_date")(e.target.value)} /></F>
          <F label="Телефон пациента"><Input value={f.phone ?? ""} onChange={(e) => set("phone")(e.target.value)} /></F>
          <F label="Контактное лицо (родственник)"><Input value={f.rep_name ?? ""} onChange={(e) => set("rep_name")(e.target.value)} /></F>
          <F label="Телефон контактного лица"><Input value={f.rep_phone ?? ""} onChange={(e) => set("rep_phone")(e.target.value)} /></F>
          <F label="Диагноз / основная проблема" wide><Textarea rows={2} value={f.diagnosis ?? ""} onChange={(e) => set("diagnosis")(e.target.value)} /></F>
          <F label="Заметки" wide><Textarea rows={3} value={f.notes ?? ""} onChange={(e) => set("notes")(e.target.value)} /></F>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy && <Icon name="Loader2" size={15} className="animate-spin" />}Сохранить
            </button>
            <button type="button" onClick={onClose} className="rounded-full bg-secondary px-5 py-2 text-sm">Отмена</button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default PatientForm;
