import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { CONDITIONS, PATIENT_STATUS, partnerCrmApi } from "@/lib/partner-api";
import PatientNotes from "@/components/partner/PatientNotes";
import { Badge, d } from "@/components/partner/ui";

const PartnerTreatmentBlock = ({ dealId, partnerId }: { dealId?: number; partnerId?: number }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["crm", "partner-patients", dealId, partnerId], queryFn: () => partnerCrmApi.patients({ deal_id: dealId, partner_id: partnerId }) });
  const [open, setOpen] = useState<number | null>(null);
  const { data: detail } = useQuery({ queryKey: ["crm", "partner-patient", open], queryFn: () => partnerCrmApi.patient(open!), enabled: !!open });
  const [text, setText] = useState("");

  const items = data?.items || [];
  if (!items.length) {
    return dealId && partnerId ? (
      <section className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5"><Icon name="BedDouble" size={15} />Партнёр ещё не принял пациента на лечение в своём кабинете</p>
      </section>
    ) : null;
  }

  const send = async () => {
    try {
      await partnerCrmApi.addNote(open!, text);
      setText("");
      qc.invalidateQueries({ queryKey: ["crm", "partner-patient", open] });
      toast.success("Сообщение видно партнёру в дневнике пациента");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Icon name="BedDouble" size={13} />Лечение у партнёра</p>
      <div className="flex flex-col gap-2">
        {items.map((p) => (
          <div key={p.id} className="rounded-lg bg-secondary/50 p-3 text-sm">
            <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full flex-wrap items-center gap-2 text-left">
              <span className="font-medium">{p.full_name}</span>
              <Badge map={PATIENT_STATUS} value={p.status} />
              <Badge map={CONDITIONS} value={p.condition} />
              <span className="ml-auto text-xs text-muted-foreground">{p.admitted_at && `с ${d(p.admitted_at)}`}{(p.discharged_at || p.planned_discharge) && ` по ${d(p.discharged_at || p.planned_discharge)}`}</span>
              <Icon name={open === p.id ? "ChevronUp" : "ChevronDown"} size={15} className="text-muted-foreground" />
            </button>
            {open === p.id && (
              <div className="mt-3 flex flex-col gap-3">
                <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-xs">
                  {p.program && <><dt className="text-muted-foreground">Программа</dt><dd>{p.program}</dd></>}
                  {p.doctor && <><dt className="text-muted-foreground">Врач</dt><dd>{p.doctor}</dd></>}
                  {p.room && <><dt className="text-muted-foreground">Палата</dt><dd>{p.room}</dd></>}
                  {p.diagnosis && <><dt className="text-muted-foreground">Диагноз</dt><dd className="whitespace-pre-line">{p.diagnosis}</dd></>}
                  {p.notes && <><dt className="text-muted-foreground">Заметки</dt><dd className="whitespace-pre-line">{p.notes}</dd></>}
                </dl>
                <div>
                  <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение партнёру в дневник пациента" className="bg-background" />
                  <button disabled={!text.trim()} onClick={send} className="mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Отправить партнёру</button>
                </div>
                {detail ? <PatientNotes notes={detail.notes} /> : <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PartnerTreatmentBlock;
