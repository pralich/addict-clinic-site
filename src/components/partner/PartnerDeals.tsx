import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { money } from "@/components/admin/config";
import { PATIENT_STATUS, partnerApi, type PartnerDeal } from "@/lib/partner-api";
import PatientForm from "./PatientForm";
import { PatientSheet } from "./PartnerPatients";
import { Badge, Empty, History, Loading, PARTNER_DEAL_STAGES, RELATIONS, Row, d, dt } from "./ui";

const commission = (x: PartnerDeal) => {
  if (!x.commission_value) return null;
  return x.commission_type === "percent" ? `${String(Number(x.commission_value)).replace(".", ",")}% · ${money((Number(x.amount) * Number(x.commission_value)) / 100)}` : money(x.commission_value);
};

const DealSheet = ({ id, onClose, onPatient, onAdmit }: { id: number; onClose: () => void; onPatient: (id: number) => void; onAdmit: (deal: PartnerDeal) => void }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["partner", "deal", id], queryFn: () => partnerApi.deal(id) });
  const list = qc.getQueryData<{ items: PartnerDeal[] }>(["partner", "deals"]);
  const row = list?.items.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const x = data?.item ? { ...row, ...data.item } as PartnerDeal : row;

  const send = async () => {
    setBusy(true);
    try {
      await partnerApi.dealNote(id, note);
      setNote("");
      qc.invalidateQueries({ queryKey: ["partner", "deal", id] });
      toast.success("Комментарий отправлен в клинику");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Сделка №{id}</p>
          <SheetTitle>{x?.title || "…"}</SheetTitle>
        </SheetHeader>
        {!x ? <Loading /> : (
          <>
            <div className="mt-2 flex flex-wrap gap-2"><Badge map={PARTNER_DEAL_STAGES} value={x.stage} />{row?.patient_status && <Badge map={PATIENT_STATUS} value={row.patient_status} />}</div>
            <dl className="mt-4 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Пациент">{row?.client_name && (row.is_anonymous ? "Анонимно" : row.client_name)}</Row>
              <Row label="Телефон">{row?.client_phone && <a href={`tel:${row.client_phone}`} className="hover:underline">{row.client_phone}</a>}</Row>
              <Row label="Контактное лицо">{x.rep_name && `${x.rep_name}${x.rep_relation ? ` (${RELATIONS[x.rep_relation] || x.rep_relation})` : ""}${x.rep_phone ? `, ${x.rep_phone}` : ""}`}</Row>
              <Row label="Программа">{x.program}</Row>
              <Row label="Сумма">{Number(x.amount) > 0 && money(x.amount)}</Row>
              <Row label="Вознаграждение">{commission(x)}</Row>
              <Row label="Заезд">{x.check_in_date && d(x.check_in_date)}</Row>
              <Row label="Выезд">{x.check_out_date && d(x.check_out_date)}</Row>
              <Row label="Менеджер клиники">{row?.manager_name && `${row.manager_name}${row.manager_phone ? `, ${row.manager_phone}` : ""}`}</Row>
              <Row label="Создана">{dt(x.created_at)}</Row>
            </dl>
            <div className="mt-5">
              {row?.patient_id ? (
                <button onClick={() => onPatient(row.patient_id!)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-medium hover:bg-secondary/70"><Icon name="BedDouble" size={16} />Открыть карточку пациента</button>
              ) : x.stage !== "lost" && (
                <button onClick={() => onAdmit(x)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Icon name="LogIn" size={16} />Принять пациента на лечение</button>
              )}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Комментарий для клиники</p>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Вопрос или информация для менеджера" />
              <button disabled={busy || !note.trim()} onClick={send} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Отправить</button>
            </div>
            <History items={data?.history || []} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const PartnerDeals = () => {
  const { data, isLoading } = useQuery({ queryKey: ["partner", "deals"], queryFn: partnerApi.deals, refetchInterval: 60000 });
  const [open, setOpen] = useState<number | null>(null);
  const [patient, setPatient] = useState<number | null>(null);
  const [admit, setAdmit] = useState<PartnerDeal | null>(null);

  return (
    <div>
      {isLoading ? <Loading /> : !data?.items.length ? <Empty icon="Handshake" text="Переданных сделок пока нет" /> : (
        <div className="divide-y rounded-2xl border bg-card">
          {data.items.map((x) => (
            <button key={x.id} onClick={() => setOpen(x.id)} className="flex w-full flex-col gap-1 p-4 text-left hover:bg-secondary/40 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{x.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[x.is_anonymous ? "Анонимно" : x.client_name, x.program, x.check_in_date && `заезд ${d(x.check_in_date)}`].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {x.patient_status ? <Badge map={PATIENT_STATUS} value={x.patient_status} /> : !["won", "lost"].includes(x.stage) && (
                  <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Ждёт приёма</span>
                )}
                <Badge map={PARTNER_DEAL_STAGES} value={x.stage} />
                {Number(x.amount) > 0 && <span className="whitespace-nowrap text-sm font-medium">{money(x.amount)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && <DealSheet id={open} onClose={() => setOpen(null)} onPatient={(id) => { setOpen(null); setPatient(id); }} onAdmit={(x) => { setOpen(null); setAdmit(x); }} />}
      {patient && <PatientSheet id={patient} onClose={() => setPatient(null)} />}
      {admit && <PatientForm dealId={admit.id} dealTitle={admit.title} onClose={() => setAdmit(null)} onSaved={(p) => setPatient(p.id)} />}
    </div>
  );
};

export default PartnerDeals;
