import func2url from "../../backend/func2url.json";
import { getToken } from "./crm-api";

const B_URL = (func2url as Record<string, string>)["crm-broadcast"];

export type Audience = {
  family: { on: boolean; relations?: string[]; active_days?: number | null; subscribers?: boolean; ids?: number[] };
  staff: { on: boolean; roles?: string[]; ids?: number[] };
};
export type Broadcast = {
  id: number;
  title: string;
  body: string;
  url: string | null;
  audience: Audience;
  status: "scheduled" | "preparing" | "sending" | "done" | "canceled";
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  recipients: number;
  devices: number;
  delivered: number;
  failed: number;
  author: string | null;
};
export type Recipient = { kind: "family" | "staff"; id: number; name: string; email: string; relation?: string | null; role?: string; devices: number };
export type AudienceCount = { family: number; staff: number; family_devices: number; staff_devices: number };

async function call<T>(action: string, body?: unknown): Promise<T> {
  const res = await fetch(`${B_URL}?action=${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() || "" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка рассылки");
  return data as T;
}

export const broadcastApi = {
  list: () => call<{ items: Broadcast[]; recipients: Recipient[] }>("list"),
  count: (audience: Audience) => call<AudienceCount>("count", { audience }),
  create: (b: { title: string; body: string; url?: string; audience: Audience; scheduled_at?: string | null }) => call<{ item: Broadcast }>("create", b),
  cancel: (id: number) => call("cancel", { id }),
};

export const pingBroadcastTick = () => (B_URL ? fetch(`${B_URL}?action=tick`).catch(() => null) : null);
