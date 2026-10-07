import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Icon from "@/components/ui/icon";
import { useOptions, type Tag } from "./useCrm";

export const TAG_COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-300",
  stone: "bg-stone-100 text-stone-700 ring-stone-300",
  red: "bg-red-100 text-red-700 ring-red-300",
  rose: "bg-rose-100 text-rose-700 ring-rose-300",
  orange: "bg-orange-100 text-orange-700 ring-orange-300",
  amber: "bg-amber-100 text-amber-800 ring-amber-300",
  yellow: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  lime: "bg-lime-100 text-lime-800 ring-lime-300",
  green: "bg-green-100 text-green-700 ring-green-300",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  teal: "bg-teal-100 text-teal-700 ring-teal-300",
  cyan: "bg-cyan-100 text-cyan-700 ring-cyan-300",
  sky: "bg-sky-100 text-sky-700 ring-sky-300",
  blue: "bg-blue-100 text-blue-700 ring-blue-300",
  indigo: "bg-indigo-100 text-indigo-700 ring-indigo-300",
  violet: "bg-violet-100 text-violet-700 ring-violet-300",
  purple: "bg-purple-100 text-purple-700 ring-purple-300",
  pink: "bg-pink-100 text-pink-700 ring-pink-300",
};

export const TAG_DOT: Record<string, string> = {
  slate: "bg-slate-500", stone: "bg-stone-500", red: "bg-red-500", rose: "bg-rose-500", orange: "bg-orange-500", amber: "bg-amber-500",
  yellow: "bg-yellow-400", lime: "bg-lime-500", green: "bg-green-500", emerald: "bg-emerald-500", teal: "bg-teal-500", cyan: "bg-cyan-500",
  sky: "bg-sky-500", blue: "bg-blue-500", indigo: "bg-indigo-500", violet: "bg-violet-500", purple: "bg-purple-500", pink: "bg-pink-500",
};

export const TAG_GROUPS: Record<string, { label: string; icon: string }> = {
  addiction: { label: "Вид зависимости", icon: "Activity" },
  service: { label: "Вид помощи", icon: "Stethoscope" },
};

export const TagBadge = ({ tag, size = "sm", onRemove }: { tag: Tag; size?: "xs" | "sm"; onRemove?: () => void }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium ${TAG_COLORS[tag.color] || TAG_COLORS.slate} ${size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}>
    {tag.name}
    {onRemove && (
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="-mr-1 rounded-full p-0.5 opacity-60 hover:opacity-100" aria-label="Убрать">
        <Icon name="X" size={11} />
      </button>
    )}
  </span>
);

export const useTagMap = () => {
  const { data } = useOptions();
  const map = new Map<number, Tag>();
  (data?.tags || []).forEach((t) => map.set(t.id, t));
  return { map, list: data?.tags || [] };
};

export const TagList = ({ ids, size = "xs", max }: { ids?: number[] | null; size?: "xs" | "sm"; max?: number }) => {
  const { map } = useTagMap();
  const tags = (ids || []).map((id) => map.get(id)).filter(Boolean) as Tag[];
  if (!tags.length) return null;
  const sorted = [...tags].sort((a, b) => (a.grp === b.grp ? a.sort - b.sort : a.grp === "addiction" ? -1 : 1));
  const shown = max ? sorted.slice(0, max) : sorted;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((t) => <TagBadge key={t.id} tag={t} size={size} />)}
      {max && sorted.length > max && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">+{sorted.length - max}</span>}
    </span>
  );
};

export const TagPicker = ({ value, onChange, trigger }: { value: number[]; onChange: (v: number[]) => void; trigger?: React.ReactNode }) => {
  const { list } = useTagMap();
  const [q, setQ] = useState("");
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const active = list.filter((t) => t.is_active || value.includes(t.id));
  const match = (t: Tag) => !q || t.name.toLowerCase().includes(q.toLowerCase());

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground">
            <Icon name="Plus" size={12} />Тег
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        <div className="border-b p-2">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти тег…" className="w-full rounded-md bg-secondary px-3 py-1.5 text-sm outline-none" />
        </div>
        <div className="max-h-[360px] overflow-y-auto p-3">
          {Object.entries(TAG_GROUPS).map(([g, meta]) => {
            const items = active.filter((t) => t.grp === g && match(t));
            if (!items.length) return null;
            return (
              <div key={g} className="mb-3 last:mb-0">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name={meta.icon} size={12} />{meta.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((t) => {
                    const on = value.includes(t.id);
                    return (
                      <button key={t.id} type="button" onClick={() => toggle(t.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${on ? `${TAG_COLORS[t.color]} ring-2` : "bg-secondary text-foreground/70 hover:text-foreground"}`}>
                        {on ? <Icon name="Check" size={11} /> : <span className={`h-2 w-2 rounded-full ${TAG_DOT[t.color]}`} />}
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {active.filter(match).length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
        </div>
        {value.length > 0 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
            <span className="text-muted-foreground">Выбрано: {value.length}</span>
            <button type="button" onClick={() => onChange([])} className="text-muted-foreground hover:text-primary">Очистить</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const TagField = ({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) => {
  const { map } = useTagMap();
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
      {value.map((id) => map.get(id)).filter(Boolean).map((t) => (
        <TagBadge key={t!.id} tag={t!} onRemove={() => onChange(value.filter((x) => x !== t!.id))} />
      ))}
      <TagPicker value={value} onChange={onChange} />
    </div>
  );
};
