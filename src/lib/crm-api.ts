import func2url from "../../backend/func2url.json";
import { getAttribution } from "./attribution";
import { reachLeadGoal } from "./goals";

const URL = (func2url as Record<string, string>).crm;
const TOKEN_KEY = "crm_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Params = Record<string, string | number | undefined | null>;

export async function api<T = any>(params: Params, method = "GET", body?: unknown): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["X-Auth-Token"] = token;
  const res = await fetch(`${URL}?${qs.toString()}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && params.resource !== "auth") {
      setToken(null);
      window.dispatchEvent(new Event("crm-logout"));
    }
    throw new ApiError(data.error || "Ошибка запроса", res.status);
  }
  return data as T;
}

const SITE_LEAD_URL = `${(func2url as Record<string, string>)["crm-api"]}?resource=site_lead`;

export async function sendPublicLead(data: { name?: string; contact: string; topic?: string; message?: string; consent: boolean; form?: string }) {
  const form = data.form || "lead";
  const res = await fetch(SITE_LEAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, form, attribution: getAttribution(form) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || "Не удалось отправить заявку", res.status);
  reachLeadGoal(form);
  return body as { ok: boolean; id?: number };
}
