import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import TrashDialog from "./TrashDialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TAG_DOT, TAG_GROUPS, TagList } from "./Tags";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import EntityForm from "./EntityForm";
import { DEFAULTS, ENTITY_DEFS } from "./entities";
import { setNavList, clearNavList } from "./navList";
import { useCrmMutation, useList, useOptions, type Tag } from "./useCrm";
import { money } from "./config";
import { useAuth } from "./AuthContext";

const ALL = "__all";

type Props = { resource: string; onOpen: (resource: string, id: number) => void };

const EntityPage = ({ resource, onOpen }: Props) => {
  const def = ENTITY_DEFS[resource];
  const { user } = useAuth();
  const { data: opts } = useOptions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [manager, setManager] = useState(ALL);
  const [partner, setPartner] = useState(ALL);
  const [tag, setTag] = useState(ALL);
  const [archived, setArchived] = useState(false);
  const [view, setView] = useState<"table" | "board">(resource === "deals" ? "board" : "table");
  const [creating, setCreating] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const mut = useCrmMutation();
  const canTrash = ["leads", "clients", "deals"].includes(resource) && user?.role !== "leads_only";

  const params = {
    search: search.trim() || undefined,
    status: status === ALL ? undefined : status,
    manager_id: manager === ALL ? undefined : manager,
    partner_id: partner === ALL ? undefined : partner,
    tag: tag === ALL ? undefined : tag,
    archived: archived ? "1" : undefined,
  };
  const { data, isLoading } = useList(resource, params);
  const items = useMemo(() => data?.items ?? [], [data]);
  const canBoard = resource === "deals" || resource === "leads";
  const selectable = canTrash && (!canBoard || view === "table");
  useEffect(() => setSel((s) => s.filter((id) => items.some((i) => i.id === id))), [items]);
  useEffect(() => {
    const ordered = canBoard && view === "board"
      ? Object.keys(def.statusMap).flatMap((k) => items.filter((i) => i[def.statusKey] === k))
      : items;
    setNavList(resource, ordered.map((i) => i.id));
  }, [items, view, canBoard, resource, def]);
  useEffect(() => () => clearNavList(resource), [resource]);
  const allChecked = items.length > 0 && items.every((i) => sel.includes(i.id));

  const trashSelected = () => {
    if (!sel.length) return;
    if (!confirm(`Переместить в корзину ${sel.length} шт.? Их можно будет восстановить в течение 30 дней.`)) return;
    mut.mutate(
      { params: { resource, action: "trash" }, method: "POST", body: { ids: sel } },
      { onSuccess: (r: any) => { toast.success(`В корзине: ${r.count}`); setSel([]); } },
    );
  };
  const createInitial = useMemo(
    () => ({ ...DEFAULTS[resource], manager_id: def.filters?.includes("manager") && user ? String(user.id) : undefined }),
    [resource, def, user],
  );

  const create = (body: Record<string, any>) =>
    mut.mutateAsync({ params: { resource }, method: "POST", body }).then((r: any) => {
      toast.success("Создано");
      onOpen(resource, r.item.id);
    });

  const exportCsv = () => {
    const cols = def.columns;
    const rows = [cols.map((c) => c.label), ...items.map((r) => cols.map((c) => String(r[c.key] ?? "")))];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${resource}.csv`;
    a.click();
  };

  const moveTo = (id: number, value: string) =>
    mut.mutate({ params: { resource, id }, method: "PUT", body: { [def.statusKey]: value } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{def.title}</h1>
          <p className="text-sm text-muted-foreground">{isLoading ? "Загрузка…" : `${items.length} записей${archived ? " в архиве" : ""}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBoard && (
            <div className="flex rounded-full border bg-card p-0.5">
              {(["board", "table"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === v ? "bg-ink text-ink-foreground" : ""}`}>
                  <Icon name={v === "board" ? "Columns3" : "List"} size={14} />{v === "board" ? "Воронка" : "Список"}
                </button>
              ))}
            </div>
          )}
          {canTrash && (
            <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)} className="rounded-full"><Icon name="Trash2" size={14} className="mr-1.5" />Корзина</Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-full"><Icon name="Download" size={14} className="mr-1.5" />CSV</Button>
          <Button size="sm" onClick={() => setCreating(true)} className="rounded-full"><Icon name="Plus" size={14} className="mr-1.5" />Добавить</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 basis-full flex-1 sm:basis-auto sm:min-w-[220px]">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…" className="bg-card pl-9" />
        </div>
        <FilterSelect value={status} onChange={setStatus} placeholder={resource === "deals" ? "Все этапы" : "Все статусы"}
          items={Object.entries(def.statusMap).map(([k, v]) => ({ value: k, label: v.label }))} />
        {def.filters?.includes("manager") && (
          <FilterSelect value={manager} onChange={setManager} placeholder="Все ответственные"
            items={[{ value: String(user?.id), label: "Мои" }, ...(opts?.users || []).filter((u) => u.id !== user?.id).map((u) => ({ value: String(u.id), label: u.name }))]} />
        )}
        {def.filters?.includes("partner") && (
          <FilterSelect value={partner} onChange={setPartner} placeholder="Все партнёры"
            items={(opts?.partners || []).map((u) => ({ value: String(u.id), label: u.name }))} />
        )}
        <TagFilter value={tag} onChange={setTag} tags={opts?.tags || []} />
        <Button variant={archived ? "default" : "outline"} size="sm" className="h-10" onClick={() => setArchived(!archived)}>
          <Icon name="Archive" size={14} className="mr-1.5" />Архив
        </Button>
      </div>

      {selectable && sel.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-sm lg:top-2">
          <span className="mr-auto text-sm font-medium">Выбрано: {sel.length}</span>
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>Снять выбор</Button>
          <Button size="sm" variant="destructive" disabled={mut.isPending} onClick={trashSelected}><Icon name="Trash2" size={14} className="mr-1.5" />Удалить</Button>
        </div>
      )}

      {canBoard && view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
          <div className="flex min-w-max gap-3">
            {Object.entries(def.statusMap).map(([k, s]) => {
              const col = items.filter((i) => i[def.statusKey] === k);
              const sum = col.reduce((a, i) => a + Number(i.amount || 0), 0);
              return (
                <div
                  key={k}
                  className="flex w-[270px] flex-col rounded-xl bg-secondary/70 p-2 2xl:w-[300px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { const id = Number(e.dataTransfer.getData("id")); if (id) moveTo(id, k); }}
                >
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    <span className="text-xs text-muted-foreground">{col.length}{resource === "deals" && sum > 0 ? ` · ${money(sum)}` : ""}</span>
                  </div>
                  <div className="flex min-h-[120px] flex-col gap-2 pt-1">
                    {col.map((i) => (
                      <button
                        key={i.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("id", String(i.id))}
                        onClick={() => onOpen(resource, i.id)}
                        className="cursor-grab rounded-lg border bg-card p-3 text-left text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                      >
                        <p className="font-medium leading-snug">{i[def.titleKey] || "Аноним"}</p>
                        {resource === "deals" ? (
                          <>
                            <p className="mt-1 text-xs text-muted-foreground">{i.client_name || "Без клиента"}</p>
                            <p className="mt-2 font-heading font-semibold">{money(i.amount)}</p>
                          </>
                        ) : (
                          <>
                            <p className="mt-1 text-xs text-muted-foreground">{i.contact}</p>
                            {i.topic && <p className="mt-1.5 inline-block rounded bg-secondary px-1.5 py-0.5 text-[11px]">{i.topic}</p>}
                          </>
                        )}
                        {i.tags?.length > 0 && <div className="mt-2"><TagList ids={i.tags} max={4} /></div>}
                        {i.manager_name && <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Icon name="User" size={11} />{i.manager_name}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
        <div className="flex flex-col gap-2 md:hidden">
          {items.map((r) => {
            const [titleCol, ...rest] = def.columns;
            const status = rest.find((c) => c.key === def.statusKey);
            const tags = rest.find((c) => c.key === "tags");
            const meta = rest.filter((c) => c !== status && c !== tags && (c.render || (r[c.key] !== null && r[c.key] !== undefined && r[c.key] !== "")));
            return (
              <div key={r.id} role="button" tabIndex={0} onClick={() => onOpen(resource, r.id)}
                className={`flex min-w-0 gap-3 rounded-xl border bg-card p-3.5 text-sm active:bg-secondary/60 ${sel.includes(r.id) ? "border-primary/50 bg-primary/5" : ""}`}>
                {selectable && (
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={sel.includes(r.id)} onCheckedChange={(c) => setSel((s) => (c ? [...s, r.id] : s.filter((x) => x !== r.id)))} aria-label="Выбрать" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate text-[15px] leading-snug">{titleCol.render ? titleCol.render(r) : r[titleCol.key] || "—"}</div>
                    {status && <div className="shrink-0 whitespace-nowrap">{status.render ? status.render(r) : r[status.key]}</div>}
                  </div>
                  {tags && r.tags?.length > 0 && <div className="mt-2 overflow-hidden">{tags.render!(r)}</div>}
                  <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
                    {meta.map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="whitespace-nowrap text-muted-foreground">{c.label}</dt>
                        <dd className="min-w-0 truncate text-right [&>*]:inline [&>*]:truncate [&_*]:whitespace-nowrap">{c.render ? c.render(r) : r[c.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            );
          })}
          {!isLoading && items.length === 0 && (
            <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
              <Icon name={def.icon} size={28} className="mx-auto mb-2 opacity-40" />
              Ничего не найдено
            </div>
          )}
        </div>
        <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-10">
                      <Checkbox checked={allChecked} onCheckedChange={(c) => setSel(c ? items.map((i) => i.id) : [])} aria-label="Выбрать все" />
                    </TableHead>
                  )}
                  {def.columns.map((c) => <TableHead key={c.key} className={`whitespace-nowrap ${c.className || ""}`}>{c.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" data-state={sel.includes(r.id) ? "selected" : undefined} onClick={() => onOpen(resource, r.id)}>
                    {selectable && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel.includes(r.id)} onCheckedChange={(c) => setSel((s) => (c ? [...s, r.id] : s.filter((x) => x !== r.id)))} aria-label="Выбрать" />
                      </TableCell>
                    )}
                    {def.columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key] ?? "—"}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={def.columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                      <Icon name={def.icon} size={28} className="mx-auto mb-2 opacity-40" />
                      Ничего не найдено
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        </>
      )}

      {canTrash && <TrashDialog resource={resource} open={trashOpen} onOpenChange={setTrashOpen} />}
      {canBoard && view === "board" && canTrash && (
        <p className="-mt-2 text-xs text-muted-foreground">Чтобы удалить несколько записей сразу, переключитесь в режим «Список».</p>
      )}

      <EntityForm open={creating} onOpenChange={setCreating} title={`Добавить ${def.single}`} fields={def.fields}
        initial={createInitial} onSubmit={create} />
    </div>
  );
};

const TagFilter = ({ value, onChange, tags }: { value: string; onChange: (v: string) => void; tags: Tag[] }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-10 w-auto min-w-[140px] max-w-full bg-card sm:min-w-[160px]"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>Все теги</SelectItem>
      {Object.entries(TAG_GROUPS).map(([g, meta]) => (
        <SelectGroup key={g}>
          <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{meta.label}</SelectLabel>
          {tags.filter((t) => t.grp === g && t.is_active).map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${TAG_DOT[t.color]}`} />{t.name}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);

const FilterSelect = ({ value, onChange, placeholder, items }: { value: string; onChange: (v: string) => void; placeholder: string; items: { value: string; label: string }[] }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-10 w-auto min-w-[140px] max-w-full bg-card sm:min-w-[160px]"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>{placeholder}</SelectItem>
      {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export default EntityPage;