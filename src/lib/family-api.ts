import func2url from "../../backend/func2url.json";
import { getToken as getCrmToken } from "./crm-api";

const URLS = func2url as Record<string, string>;
const FAMILY_URL = URLS.family;
const AI_URL = URLS["family-ai"];
const TOKEN_KEY = "family_token";

export const getFamilyToken = () => localStorage.getItem(TOKEN_KEY);
export const setFamilyToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

type Params = Record<string, string | number | undefined | null>;

export class FamilyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(base: string, params: Params, method = "GET", body?: unknown, token = getFamilyToken()): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== "" && qs.set(k, String(v)));
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Auth-Token"] = token;
  const res = await fetch(`${base}?${qs}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && base === FAMILY_URL && params.resource !== "auth" && !String(params.resource || "").startsWith("admin_")) {
      setFamilyToken(null);
      window.dispatchEvent(new Event("family-logout"));
    }
    throw new FamilyApiError(data.error || "Ошибка запроса", res.status);
  }
  return data as T;
}

export const RELATIONS: Record<string, string> = {
  spouse: "Супруг(а)",
  parent: "Родитель",
  child: "Сын / дочь",
  sibling: "Брат / сестра",
  partner: "Партнёр",
  friend: "Друг / подруга",
  other: "Не хочу раскрывать",
};

export type FamilyUser = { id: number; name: string; email: string; phone?: string | null; relation?: string | null; created_at: string };
export type FamilyStats = { answered: number; waiting: number; events: number; ai_chats: number; tokens?: number; plans?: string[]; trial_ends_at?: string | null; trial_active?: boolean; can_ask?: boolean };
export type BillingPlan = { code: string; title: string; price: number; days: number };
export type BillingOrder = { order_number: string; status: "pending" | "paid" | "canceled"; amount: string | number; product_code: string; tokens: number; created_at: string; paid_at?: string | null; title?: string | null };
export type BillingOverview = {
  balance: number;
  subscriptions: { plan: string; ends_at: string }[];
  orders: BillingOrder[];
  catalog: { token_price_per_1000: number; token_packs: { thousands: number; tokens: number; price: number }[]; plans: BillingPlan[] };
  payments_enabled: boolean;
};
export type Question = {
  id: number;
  topic?: string | null;
  question: string;
  answer?: string | null;
  status: string;
  created_at: string;
  answered_at?: string | null;
  answered_by_name?: string | null;
  user_name?: string;
  user_email?: string;
  user_phone?: string | null;
  user_relation?: string | null;
};
export type FamilyEvent = {
  id: number;
  title: string;
  description?: string | null;
  kind: "webinar" | "offline";
  starts_at: string;
  duration_min: number;
  location?: string | null;
  link?: string | null;
  host?: string | null;
  capacity?: number | null;
  cover_url?: string | null;
  status: string;
  regs: number;
  registered?: boolean;
};
export type AiChat = { id: number; mode: string; title: string; settings?: string | null; updated_at: string; last_message?: string | null };
export type AiMessage = { id: number; role: "user" | "assistant" | "feedback"; content: string; created_at: string };

export const familyApi = {
  register: (b: { name: string; email: string; password: string; phone?: string; relation?: string }) =>
    call<{ token: string }>(FAMILY_URL, { resource: "auth", action: "register" }, "POST", b),
  login: (b: { email: string; password: string }) => call<{ token: string }>(FAMILY_URL, { resource: "auth", action: "login" }, "POST", b),
  logout: () => call(FAMILY_URL, { resource: "auth", action: "logout" }, "POST", {}),
  me: () => call<{ user: FamilyUser; stats: FamilyStats }>(FAMILY_URL, { resource: "auth", action: "me" }),
  updateMe: (b: Partial<FamilyUser>) => call<{ user: FamilyUser; stats: FamilyStats }>(FAMILY_URL, { resource: "auth", action: "update" }, "POST", b),
  questions: () => call<{ items: Question[] }>(FAMILY_URL, { resource: "questions" }),
  ask: (b: { topic?: string; question: string }) => call<{ item: Question }>(FAMILY_URL, { resource: "questions" }, "POST", b),
  events: () => call<{ items: FamilyEvent[] }>(FAMILY_URL, { resource: "events" }),
  register_event: (id: number) => call(FAMILY_URL, { resource: "events", id }, "POST", {}),
  cancel_event: (id: number) => call(FAMILY_URL, { resource: "events", id, action: "cancel" }, "POST", {}),
  billing: () => call<BillingOverview>(FAMILY_URL, { resource: "billing" }),
  billingOrder: (order: string) => call<{ order: BillingOrder }>(FAMILY_URL, { resource: "billing", order }),
  pay: (b: { product: string; thousands?: number; return_url: string }) =>
    call<{ payment_url: string; order_number: string }>(FAMILY_URL, { resource: "billing", action: "pay" }, "POST", b),
};

export const fmtRub = (n: number | string) => `${Number(n).toLocaleString("ru-RU")} ₽`;
export const fmtNum = (n: number) => n.toLocaleString("ru-RU");

export const aiApi = {
  status: () => call<{ enabled: boolean }>(AI_URL, { action: "status" }),
  chats: () => call<{ items: AiChat[] }>(AI_URL, {}),
  chat: (id: number) => call<{ chat: AiChat; messages: AiMessage[] }>(AI_URL, { id }),
  send: (b: { message: string; mode?: string; settings?: Record<string, string> }, id?: number) =>
    call<{ chat: AiChat; message: AiMessage }>(AI_URL, { id }, "POST", b),
  feedback: (id: number) => call<{ chat: AiChat; message: AiMessage }>(AI_URL, { id, action: "feedback" }, "POST", {}),
  remove: (id: number) => call(AI_URL, { id }, "DELETE"),
};

const staff = <T,>(params: Params, method = "GET", body?: unknown) => call<T>(FAMILY_URL, params, method, body, getCrmToken());

export const familyAdminApi = {
  stats: () => staff<{ users: number; new_questions: number; upcoming: number; ai_chats: number }>({ resource: "admin_stats" }),
  questions: (status?: string) => staff<{ items: Question[] }>({ resource: "admin_questions", status }),
  answer: (id: number, answer: string) => staff<{ item: Question }>({ resource: "admin_questions", id }, "PUT", { answer }),
  events: () => staff<{ items: FamilyEvent[] }>({ resource: "admin_events" }),
  eventRegs: (id: number) => staff<{ items: { name: string; email: string; phone?: string; relation?: string; created_at: string }[] }>({ resource: "admin_events", id, regs: 1 }),
  saveEvent: (b: Partial<FamilyEvent>, id?: number) => staff<{ item: FamilyEvent }>({ resource: "admin_events", id }, id ? "PUT" : "POST", b),
  archiveEvent: (id: number) => staff({ resource: "admin_events", id }, "DELETE"),
  users: () => staff<{ items: (FamilyUser & { last_seen_at?: string; questions: number; events: number; ai_chats: number })[] }>({ resource: "admin_users" }),
};

export const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";