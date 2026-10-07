import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import EntityForm from "./EntityForm";
import LeadAttribution from "./LeadAttribution";
import ActivityPanel from "./ActivityPanel";
import { ENTITY_DEFS } from "./entities";
import { DEAL_STAGES, LEAD_STATUS, CLIENT_STATUS, fmtDate, money } from "./config";
import { useCrmMutation, useItem } from "./useCrm";

type Props = {
  resource: string;
  id: number | null;
  onClose: () => void;
  onOpen: (resource: string, id: number) => void;
};

const EntityDrawer = ({ resource, id, onClose, onOpen }: Props) => {
  const def = ENTITY_DEFS[resource];
  const { data, isLoading } = useItem(resource, id);
  const mut = useCrmMutation();
  const [edit, setEdit] = useState(false);
  const item = data?.item;

  const save = (body: Record<string, any>) => mut.mutateAsync({ params: { resource, id }, method: "PUT", body }).then(() => toast.success("Сохранено"));

  const changeStatus = (value: string) => mut.mutate({ params: { resource, id }, method: "PUT", body: { [def.statusKey]: value } });

  const archive = () =>
    mut.mutate(
      item?.archived_at
        ? { params: { resource, id, action: "restore" }, method: "POST" }
        : { params: { resource, id }, method: "DELETE" },
      { onSuccess: () => { toast.success(item?.archived_at ? "Восстановлено" : "Перемещено в архив"); onClose(); } },
    );

  const convert = () =>
    mut.mutate(
      { params: { resource: "leads", id, action: "convert" }, method: "POST", body: { create_deal: true } },
      { onSuccess: (r: any) => { toast.success("Создан клиент и сделка"); if (r.deal_id) onOpen("deals", r.deal_id); } },
    );

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl lg:w-[min(1152px,96vw)] lg:max-w-none lg:overflow-hidden">
        {isLoading || !item ? (
          <div className="flex h-40 items-center justify-center lg:h-full"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid lg:h-full lg:grid-cols-2">
          <div className="flex flex-col gap-6 border-b px-5 py-6 lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-6">
            <SheetHeader className="pr-8 text-left">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{def.title} · #{item.id}</p>
              <SheetTitle className="font-heading text-2xl">{item[def.titleKey] || "Аноним"}</SheetTitle>
              {item.archived_at && <p className="text-sm text-primary">В архиве с {fmtDate(item.archived_at)}</p>}
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEdit(true)}><Icon name="Pencil" size={14} className="mr-1.5" />Редактировать</Button>
              {resource === "leads" && item.status !== "converted" && (
                <Button size="sm" variant="outline" onClick={convert}><Icon name="ArrowRightLeft" size={14} className="mr-1.5" />В клиента и сделку</Button>
              )}
              <Button size="sm" variant="outline" onClick={archive}>
                <Icon name={item.archived_at ? "ArchiveRestore" : "Archive"} size={14} className="mr-1.5" />
                {item.archived_at ? "Восстановить" : "В архив"}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{resource === "deals" ? "Этап" : "Статус"}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(def.statusMap).map(([k, s]) => (
                  <button
                    key={k}
                    onClick={() => changeStatus(k)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${item[def.statusKey] === k ? `${s.cls} border-transparent font-semibold` : "hover:bg-secondary"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 rounded-xl border bg-card p-4 text-sm">
              {(item.manager_id !== undefined) && (
                <>
                  <dt className="text-muted-foreground">Ответственный</dt>
                  <dd>{item.manager_name || "—"}</dd>
                </>
              )}
              {def.details.map((d) => (
                <div key={d.key} className="contents">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="whitespace-pre-wrap break-words">{(d.render ? d.render(item) : item[d.key]) || "—"}</dd>
                </div>
              ))}
              {item.client_id && resource !== "clients" && (
                <>
                  <dt className="text-muted-foreground">Клиент</dt>
                  <dd><button className="text-primary hover:underline" onClick={() => onOpen("clients", item.client_id)}>Открыть карточку</button></dd>
                </>
              )}
              {item.partner_id && resource !== "partners" && (
                <>
                  <dt className="text-muted-foreground">Партнёр</dt>
                  <dd><button className="text-primary hover:underline" onClick={() => onOpen("partners", item.partner_id)}>Открыть карточку</button></dd>
                </>
              )}
            </dl>

            {resource === "leads" && <LeadAttribution lead={item} />}

            {data?.related?.deals && (
              <Related title="Сделки" items={data.related.deals} onClick={(r) => onOpen("deals", r.id)}
                render={(r) => <><span className="truncate">{r.title}</span><span className="flex items-center gap-2"><StatusBadge map={DEAL_STAGES} value={r.stage} /><span className="whitespace-nowrap text-xs">{money(r.amount)}</span></span></>} />
            )}
            {data?.related?.leads && (
              <Related title="Лиды" items={data.related.leads} onClick={(r) => onOpen("leads", r.id)}
                render={(r) => <><span className="truncate">{r.name || r.contact}</span><StatusBadge map={LEAD_STATUS} value={r.status} /></>} />
            )}
            {data?.related?.clients && (
              <Related title="Клиенты" items={data.related.clients} onClick={(r) => onOpen("clients", r.id)}
                render={(r) => <><span className="truncate">{r.full_name}</span><StatusBadge map={CLIENT_STATUS} value={r.status} /></>} />
            )}

          </div>
          <div className="flex flex-col gap-5 bg-secondary/30 px-5 py-6 lg:h-full lg:overflow-y-auto lg:px-6">
            <p className="font-heading text-lg font-semibold lg:pr-8">Активность</p>
            <ActivityPanel resource={resource} id={id!} activities={data?.activities ?? []} />
          </div>
          </div>
        )}
        <EntityForm open={edit} onOpenChange={setEdit} title={`Редактировать ${def.single}`} fields={def.fields} initial={item} onSubmit={save} />
      </SheetContent>
    </Sheet>
  );
};

const Related = ({ title, items, onClick, render }: { title: string; items: any[]; onClick: (r: any) => void; render: (r: any) => React.ReactNode }) => (
  <div>
    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title} · {items.length}</p>
    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground">Пока нет</p>
    ) : (
      <div className="divide-y rounded-xl border bg-card">
        {items.map((r) => (
          <button key={r.id} onClick={() => onClick(r)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-secondary/60">
            {render(r)}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default EntityDrawer;