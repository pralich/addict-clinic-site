import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import EntityForm from "./EntityForm";
import { ENTITY_DEFS } from "./entities";
import { ACTIVITY_KINDS, DEAL_STAGES, LEAD_STATUS, CLIENT_STATUS, fmtDate, money } from "./config";
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
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("note");
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

  const addNote = () => {
    if (!note.trim()) return;
    mut.mutate({ params: { resource: "activities" }, method: "POST", body: { entity_type: resource, entity_id: id, text: note, kind } }, { onSuccess: () => setNote("") });
  };

  const convert = () =>
    mut.mutate(
      { params: { resource: "leads", id, action: "convert" }, method: "POST", body: { create_deal: true } },
      { onSuccess: (r: any) => { toast.success("Создан клиент и сделка"); if (r.deal_id) onOpen("deals", r.deal_id); } },
    );

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {isLoading || !item ? (
          <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            <SheetHeader className="text-left">
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

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">История и заметки</p>
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex flex-wrap gap-1">
                  {["note", "call", "meeting", "task"].map((k) => (
                    <button key={k} onClick={() => setKind(k)} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${kind === k ? "bg-ink text-ink-foreground" : "bg-secondary"}`}>
                      <Icon name={ACTIVITY_KINDS[k].icon} size={12} />{ACTIVITY_KINDS[k].label}
                    </button>
                  ))}
                </div>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Добавить запись…" />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={addNote} disabled={!note.trim()}>Добавить</Button>
                </div>
              </div>
              <ol className="mt-4 space-y-3 border-l pl-4">
                {data?.activities.map((a) => (
                  <li key={a.id} className="relative text-sm">
                    <span className="absolute -left-[23px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background ring-2 ring-border" />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon name={ACTIVITY_KINDS[a.kind]?.icon || "Dot"} size={12} />
                      {ACTIVITY_KINDS[a.kind]?.label} · {a.user_name || "Сайт"} · {fmtDate(a.created_at, true)}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap">{a.text}</p>
                  </li>
                ))}
              </ol>
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