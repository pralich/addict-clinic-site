import type { StatusMap } from "./config";

const StatusBadge = ({ map, value }: { map: StatusMap; value?: string | null }) => {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const s = map[value] || { label: value, cls: "bg-neutral-200 text-neutral-700" };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
};

export default StatusBadge;
