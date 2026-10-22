import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { fmtMsk, fmtMskDate } from "@/lib/msk";
import type { HistoryItem } from "@/lib/partner-api";

export const Badge = ({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string | null | undefined }) =>
  value && map[value] ? <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${map[value].cls}`}>{map[value].label}</span> : null;

export const d = (v: string | null | undefined) => (v ? fmtMskDate(v.length === 10 ? `${v}T12:00:00Z` : v) : "—");
export const dt = (v: string | null | undefined) => (v ? fmtMsk(v, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export const Row = ({ label, children }: { label: string; children: ReactNode }) =>
  children ? (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  ) : null;

export const Empty = ({ icon, text }: { icon: string; text: string }) => (
  <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
    <Icon name={icon} size={28} />
    <p className="text-sm">{text}</p>
  </div>
);

export const Loading = () => <div className="mt-10 flex justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;

export const History = ({ items }: { items: HistoryItem[] }) =>
  items.length ? (
    <div className="mt-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">История</p>
      <ul className="flex flex-col gap-2">
        {items.map((h) => (
          <li key={h.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
            <p className="whitespace-pre-line">{h.text.replace(/^Для партнёра:\s*/, "")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{dt(h.created_at)}{h.user_name ? ` · ${h.user_name}` : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

export const PARTNER_LEAD_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Новый", cls: "bg-primary/10 text-primary" },
  in_work: { label: "В работе", cls: "bg-amber-100 text-amber-800" },
  qualified: { label: "Квалифицирован", cls: "bg-sky-100 text-sky-800" },
  converted: { label: "Стал сделкой", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Отказ", cls: "bg-neutral-200 text-neutral-600" },
};

export const PARTNER_DEAL_STAGES: Record<string, { label: string; cls: string }> = {
  new: { label: "Новая", cls: "bg-neutral-200 text-neutral-700" },
  consult: { label: "Консультация", cls: "bg-sky-100 text-sky-800" },
  diagnostics: { label: "Диагностика", cls: "bg-indigo-100 text-indigo-800" },
  offer: { label: "Программа согласована", cls: "bg-amber-100 text-amber-800" },
  treatment: { label: "Лечение", cls: "bg-violet-100 text-violet-800" },
  won: { label: "Завершена", cls: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Отказ", cls: "bg-neutral-200 text-neutral-600" },
};

export const RELATIONS: Record<string, string> = {
  self: "Сам пациент", spouse: "Супруг(а)", parent: "Родитель", child: "Ребёнок", sibling: "Брат / сестра",
  relative: "Родственник", friend: "Друг", colleague: "Коллега", employer: "Работодатель", guardian: "Опекун", other: "Другое",
};
