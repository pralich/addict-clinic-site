import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import EntityForm from "./EntityForm";
import LeadAttribution from "./LeadAttribution";
import ActivityPanel from "./ActivityPanel";
import ContactPerson, { ContactInfo } from "./ContactPerson";
import CallButton from "./CallButton";
import BillingBlock from "./billing/BillingBlock";
import NextPayment from "./billing/NextPayment";
import { TAG_GROUPS, TagBadge, TagPicker, useTagMap } from "./Tags";
import { ENTITY_DEFS } from "./entities";
import { DEAL_STAGES, LEAD_STATUS, CLIENT_STATUS, fmtDate, money } from "./config";
import { useCrmMutation, useItem } from "./useCrm";
import { useAuth } from "./AuthContext";

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
  const { user } = useAuth();
  const limited = user?.role === "leads_only";
  const item = data?.item;
  const refs = data?.refs ?? {};

  const save = (body: Record<string, any>) => mut.mutateAsync({ params: { resource, id }, method: "PUT", body }).then(() => toast.success("Сохранено"));

  const changeStatus = (value: string) => mut.mutate({ params: { resource, id }, method: "PUT", body: { [def.statusKey]: value } });

  const archive = () =>
    mut.mutate(
      item?.archived_at
        ? { params: { resource, id, action: "restore" }, method: "POST" }
        : { params: { resource, id }, method: "DELETE" },
      { onSuccess: () => { toast.success(item?.archived_at ? "Восстановлено" : "Перемещено в архив"); onClose(); } },
    );

  const canTrash = (resource === "leads" || resource === "clients") && !limited;
  const trash = () =>
    confirm("Переместить в корзину? Восстановить можно в течение 30 дней.") &&
    mut.mutate(
      { params: { resource, action: "trash" }, method: "POST", body: { ids: [id] } },
      { onSuccess: () => { toast.success("Перемещено в корзину"); onClose(); } },
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
              {item.trashed_at ? (
                <p className="text-sm text-destructive">В корзине с {fmtDate(item.trashed_at)}</p>
              ) : item.archived_at && <p className="text-sm text-primary">В архиве с {fmtDate(item.archived_at)}</p>}
            </SheetHeader>

            <DrawerTags value={item.tags || []} onChange={(tags) => mut.mutate({ params: { resource, id }, method: "PUT", body: { tags } })} />

            <div className="flex flex-wrap gap-2">
              {resource === "clients" && <CallButton targets={[{ label: item.full_name || "Клиент", phone: item.phone }, { label: item.rep_name ? `${item.rep_name} (контактное лицо)` : "Контактное лицо", phone: item.rep_phone }]} />}
              {resource === "leads" && <CallButton leadId={item.id} targets={[{ label: item.name || "Лид", phone: item.contact, field: "contact" }, { label: item.rep_name ? `${item.rep_name} (контактное лицо)` : "Контактное лицо", phone: item.rep_phone, field: "rep_phone" }]} />}
              <Button size="sm" onClick={() => setEdit(true)}><Icon name="Pencil" size={14} className="mr-1.5" />Редактировать</Button>
              {resource === "leads" && item.status !== "converted" && !limited && (
                <Button size="sm" variant="outline" onClick={convert}><Icon name="ArrowRightLeft" size={14} className="mr-1.5" />В клиента и сделку</Button>
              )}
              <Button size="sm" variant="outline" onClick={archive}>
                <Icon name={item.archived_at ? "ArchiveRestore" : "Archive"} size={14} className="mr-1.5" />
                {item.archived_at ? "Восстановить" : "В архив"}
              </Button>
              {canTrash && !item.trashed_at && (
                <Button size="sm" variant="outline" onClick={trash} className="text-destructive hover:text-destructive">
                  <Icon name="Trash2" size={14} className="mr-1.5" />В корзину
                </Button>
              )}
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
              {limited && resource === "leads" && (
              <p className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                <Icon name="EyeOff" size={14} />Контакты скрыты. Звонок через кнопку «Позвонить» работает — номер подставит система.
              </p>
            )}
            {item.client_id && resource !== "clients" && !limited && (
                <>
                  <dt className="text-muted-foreground">Клиент</dt>
                  <dd>
                    <RefLink onClick={() => onOpen("clients", item.client_id)} icon="UserRound"
                      title={refs.client?.name || `Клиент #${item.client_id}`}
                      lines={[refs.client?.phone, refs.client?.email]} />
                  </dd>
                </>
              )}
              {item.lead_id && resource === "deals" && (
                <>
                  <dt className="text-muted-foreground">Лид</dt>
                  <dd>
                    <RefLink onClick={() => onOpen("leads", item.lead_id)} icon="Inbox"
                      title={refs.lead?.name || "Аноним"}
                      lines={[refs.lead?.contact, refs.lead?.created_at ? `от ${fmtDate(refs.lead.created_at)}` : null]} />
                  </dd>
                </>
              )}
              {item.partner_id && resource !== "partners" && (
                <>
                  <dt className="text-muted-foreground">Партнёр</dt>
                  <dd>
                    <RefLink onClick={() => onOpen("partners", item.partner_id)} icon="Building2"
                      title={refs.partner?.name || `Партнёр #${item.partner_id}`}
                      lines={[refs.partner?.contact_person, refs.partner?.phone]} />
                  </dd>
                </>
              )}
            </dl>

            {resource === "clients" && <ContactInfo data={item} onEdit={() => setEdit(true)} />}
            {resource === "deals" && <ContactInfo data={item.client_id ? refs.client || {} : null} onOpenClient={item.client_id ? () => onOpen("clients", item.client_id) : undefined} />}
            {["leads", "deals", "clients"].includes(resource) && <ContactPerson item={item} onEdit={() => setEdit(true)} />}

            {resource === "leads" && <LeadAttribution lead={item} />}

            {resource === "deals" && <NextPayment deal={item} onEdit={() => setEdit(true)} />}

            {(resource === "deals" || resource === "clients" || resource === "partners") && <BillingBlock resource={resource} item={item} onOpen={onOpen} />}

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
        <EntityForm open={edit} onOpenChange={setEdit} title={`Редактировать ${def.single}`}
          fields={limited ? def.fields.filter((f) => !["contact", "rep_phone", "rep_email", "rep_messenger", "client_id"].includes(f.name)) : def.fields}
          initial={item} onSubmit={save} />
      </SheetContent>
    </Sheet>
  );
};

const DrawerTags = ({ value: initial, onChange: save }: { value: number[]; onChange: (v: number[]) => void }) => {
  const { map } = useTagMap();
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = (v: number[]) => { setValue(v); save(v); };
  const tags = value.map((id) => map.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof map.get>>[];
  return (
    <div className="-mt-2 flex flex-col gap-1.5">
      {Object.entries(TAG_GROUPS).map(([g, meta]) => {
        const items = tags.filter((t) => t.grp === g);
        if (!items.length) return null;
        return (
          <div key={g} className="flex flex-wrap items-center gap-1.5">
            <span className="w-[112px] shrink-0 text-xs text-muted-foreground">{meta.label}</span>
            {items.map((t) => <TagBadge key={t.id} tag={t} onRemove={() => onChange(value.filter((x) => x !== t.id))} />)}
          </div>
        );
      })}
      <div>
        <TagPicker value={value} onChange={onChange} trigger={
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground">
            <Icon name="Tag" size={12} />{tags.length ? "Изменить теги" : "Добавить теги"}
          </button>
        } />
      </div>
    </div>
  );
};

const RefLink = ({ title, lines, icon, onClick }: { title: string; lines: (string | null | undefined)[]; icon: string; onClick: () => void }) => {
  const sub = lines.filter(Boolean);
  return (
    <button onClick={onClick} className="group -mx-2 -my-1 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1 text-left hover:bg-secondary">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground group-hover:bg-background">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-primary">{title}</span>
        {sub.length > 0 && <span className="block truncate text-xs text-muted-foreground">{sub.join(" · ")}</span>}
      </span>
      <Icon name="ChevronRight" size={15} className="shrink-0 text-muted-foreground" />
    </button>
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