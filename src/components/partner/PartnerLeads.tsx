import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { partnerApi, type PartnerLead } from "@/lib/partner-api";
import { Badge, Empty, History, Loading, PARTNER_LEAD_STATUS, RELATIONS, Row, dt } from "./ui";

const FILTERS = [["", "Все"], ["new", "Новые"], ["in_work", "В работе"], ["qualified", "Квалифицированы"], ["converted", "Стали сделкой"], ["rejected", "Отказ"]] as const;

const LeadSheet = ({ id, onClose }: { id: number; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["partner", "lead", id], queryFn: () => partnerApi.lead(id) });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const l = data?.item;

  const save = async (body: { status?: string; note?: string }) => {
    setBusy(true);
    try {
      await partnerApi.updateLead(id, body);
      setNote("");
      qc.invalidateQueries({ queryKey: ["partner"] });
      toast.success("Сохранено, менеджер клиники увидит изменения");
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
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Лид №{id}</p>
          <SheetTitle>{l?.name || "Без имени"}</SheetTitle>
        </SheetHeader>
        {!l ? <Loading /> : (
          <>
            <div className="mt-2"><Badge map={PARTNER_LEAD_STATUS} value={l.status} /></div>
            <dl className="mt-4 grid grid-cols-[130px_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Контакт">{l.contact && <a href={/^\+?\d/.test(l.contact) ? `tel:${l.contact}` : `mailto:${l.contact}`} className="font-medium hover:underline">{l.contact}</a>}</Row>
              <Row label="Повод">{l.topic}</Row>
              <Row label="Комментарий"><span className="whitespace-pre-line">{l.message}</span></Row>
              <Row label="Контактное лицо">{l.rep_name && `${l.rep_name}${l.rep_relation ? ` (${RELATIONS[l.rep_relation] || l.rep_relation})` : ""}`}</Row>
              <Row label="Тел. контакт. лица">{l.rep_phone && <a href={`tel:${l.rep_phone}`} className="hover:underline">{l.rep_phone}</a>}</Row>
              <Row label="Мессенджер">{l.rep_messenger}</Row>
              <Row label="Передан">{dt(l.created_at)}</Row>
              <Row label="Менеджер клиники">{l.manager_name && `${l.manager_name}${l.manager_phone ? `, ${l.manager_phone}` : ""}`}</Row>
            </dl>
            {l.status !== "converted" && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Статус работы</p>
                <div className="flex flex-wrap gap-2">
                  {(["in_work", "qualified", "rejected"] as const).map((s) => (
                    <button key={s} disabled={busy || l.status === s} onClick={() => save({ status: s })}
                      className={`rounded-full px-3 py-1.5 text-sm ${l.status === s ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"} disabled:cursor-default`}>
                      {PARTNER_LEAD_STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Комментарий для клиники</p>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: связались, договорились о консультации на четверг" />
              <button disabled={busy || !note.trim()} onClick={() => save({ note })}
                className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Отправить</button>
            </div>
            <History items={data.history} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const PartnerLeads = () => {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["partner", "leads", status, q], queryFn: () => partnerApi.leads({ status, q }), refetchInterval: 60000 });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-full bg-secondary p-1 [scrollbar-width:none]">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${status === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="relative w-full sm:ml-auto sm:w-64">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" className="pl-9" />
        </div>
      </div>
      {isLoading ? <Loading /> : !data?.items.length ? <Empty icon="Inbox" text="Переданных лидов пока нет" /> : (
        <div className="mt-4 divide-y rounded-2xl border bg-card">
          {data.items.map((l: PartnerLead) => (
            <button key={l.id} onClick={() => setOpen(l.id)} className="flex w-full flex-col gap-1 p-4 text-left hover:bg-secondary/40 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.name || "Без имени"} <span className="font-normal text-muted-foreground">· {l.contact}</span></p>
                <p className="truncate text-sm text-muted-foreground">{l.topic || l.message || "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge map={PARTNER_LEAD_STATUS} value={l.status} />
                <span className="whitespace-nowrap text-xs text-muted-foreground">{dt(l.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && <LeadSheet id={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default PartnerLeads;
