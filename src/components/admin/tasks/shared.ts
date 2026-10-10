import type { Options } from "../useCrm";

export type Task = {
  id: number;
  text: string;
  details: string | null;
  priority: "low" | "normal" | "high";
  due_at: string | null;
  done_at: string | null;
  created_at: string;
  user_id: number | null;
  author_name: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  entity_type: "leads" | "deals" | "clients" | "partners" | null;
  entity_id: number | null;
  entity_title: string | null;
  result_text?: string | null;
  comments_count?: number;
};

export const PRIORITIES: Record<Task["priority"], { label: string; cls: string; icon: string }> = {
  low: { label: "Низкий", cls: "text-muted-foreground", icon: "ArrowDown" },
  normal: { label: "Обычный", cls: "text-sky-700", icon: "Minus" },
  high: { label: "Высокий", cls: "text-primary", icon: "ArrowUp" },
};

export const ENTITY_LINKS: { value: NonNullable<Task["entity_type"]>; label: string; icon: string; opt: keyof Options }[] = [
  { value: "leads", label: "Лид", icon: "Inbox", opt: "leads" },
  { value: "deals", label: "Сделка", icon: "Handshake", opt: "deals" },
  { value: "clients", label: "Клиент", icon: "User", opt: "clients" },
  { value: "partners", label: "Партнёр", icon: "Building2", opt: "partners" },
];

export const taskDue = (t: Task) => {
  if (!t.due_at) return { label: "Без срока", cls: "text-muted-foreground", group: "nodate" as const };
  const d = new Date(t.due_at);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day.getTime() - start.getTime()) / 86400000);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  if (t.done_at) return { label: `${date}, ${time}`, cls: "text-muted-foreground", group: "done" as const };
  if (d.getTime() < now.getTime()) return { label: diff === 0 ? `Сегодня ${time} · просрочено` : `${date} · просрочено`, cls: "text-primary font-medium", group: "overdue" as const };
  if (diff === 0) return { label: `Сегодня, ${time}`, cls: "text-amber-700 font-medium", group: "today" as const };
  if (diff === 1) return { label: `Завтра, ${time}`, cls: "text-foreground", group: "soon" as const };
  if (diff <= 7) return { label: `${d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}, ${time}`, cls: "text-foreground", group: "soon" as const };
  return { label: `${date}, ${time}`, cls: "text-muted-foreground", group: "later" as const };
};

export const GROUPS: { key: ReturnType<typeof taskDue>["group"]; label: string }[] = [
  { key: "overdue", label: "Просрочено" },
  { key: "today", label: "Сегодня" },
  { key: "soon", label: "На этой неделе" },
  { key: "later", label: "Позже" },
  { key: "nodate", label: "Без срока" },
  { key: "done", label: "Выполнено" },
];
