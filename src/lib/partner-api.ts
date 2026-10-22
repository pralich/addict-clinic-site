import func2url from "../../backend/func2url.json";
import { getToken as getCrmToken } from "./crm-api";

const URL_ = (func2url as Record<string, string>).partner;
const TOKEN_KEY = "partner_token";

export const getPartnerToken = () => localStorage.getItem(TOKEN_KEY);
export const setPartnerToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

type Params = Record<string, string | number | undefined | null>;

async function call<T>(params: Params, method = "GET", body?: unknown, crm = false): Promise<T> {
  if (!URL_) throw new Error("Кабинет партнёра ещё не опубликован");
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== "" && qs.set(k, String(v)));
  if (crm) qs.set("scope", "crm");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = crm ? getCrmToken() : getPartnerToken();
  if (token) headers[crm ? "X-Crm-Token" : "X-Auth-Token"] = token;
  const res = await fetch(`${URL_}?${qs}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !crm && params.resource !== "auth") {
      setPartnerToken(null);
      window.dispatchEvent(new Event("partner-logout"));
    }
    throw new Error(data.error || "Ошибка запроса");
  }
  return data as T;
}

export type PartnerUser = { id: number; name: string; email: string; phone: string | null; partner_id: number; partner_name: string; partner_type: string; commission_percent: number };

export type PartnerLead = {
  id: number; name: string | null; contact: string; topic: string | null; message: string | null; status: string;
  rep_name: string | null; rep_relation: string | null; rep_phone: string | null; rep_email: string | null; rep_messenger: string | null;
  created_at: string; updated_at: string; manager_name: string | null; manager_phone: string | null;
};

export type PartnerDeal = {
  id: number; title: string; stage: string; program: string | null; amount: number; check_in_date: string | null; treatment_months: number | null;
  check_out_date: string | null; notes: string | null; commission_type: string | null; commission_value: number | null; created_at: string;
  client_name: string | null; client_phone: string | null; client_birth_date: string | null; is_anonymous: boolean;
  rep_name: string | null; rep_relation: string | null; rep_phone: string | null; manager_name: string | null; manager_phone: string | null;
  patient_id: number | null; patient_status: string | null;
};

export type Patient = {
  id: number; partner_id: number; deal_id: number | null; client_id: number | null; full_name: string; birth_date: string | null; phone: string | null;
  rep_name: string | null; rep_phone: string | null; program: string | null; status: string; admitted_at: string | null; planned_discharge: string | null;
  discharged_at: string | null; room: string | null; doctor: string | null; diagnosis: string | null; condition: string | null; notes: string | null;
  created_at: string; updated_at: string; deal_title: string | null; deal_stage: string | null; last_note_at: string | null; partner_name?: string | null;
};

export type PatientNote = { id: number; kind: string; condition: string | null; text: string; created_at: string; author: string | null; from_clinic: boolean };
export type HistoryItem = { id: number; kind: string; text: string; created_at: string; user_name: string | null };
export type Overview = { leads: number; leads_new: number; deals: number; deals_waiting: number; in_treatment: number; expected: number; no_report_today: number };
export type PartnerAccess = { id: number; name: string; email: string; phone: string | null; is_active: boolean; last_login_at: string | null; created_at: string };

export const PATIENT_STATUS: Record<string, { label: string; cls: string }> = {
  expected: { label: "Ожидается", cls: "bg-amber-100 text-amber-800" },
  admitted: { label: "На лечении", cls: "bg-violet-100 text-violet-800" },
  discharged: { label: "Выписан", cls: "bg-emerald-100 text-emerald-800" },
  interrupted: { label: "Прервал лечение", cls: "bg-neutral-200 text-neutral-700" },
};

export const CONDITIONS: Record<string, { label: string; cls: string }> = {
  stable: { label: "Стабильное", cls: "bg-sky-100 text-sky-800" },
  improving: { label: "Улучшение", cls: "bg-emerald-100 text-emerald-800" },
  worsening: { label: "Ухудшение", cls: "bg-amber-100 text-amber-800" },
  critical: { label: "Тяжёлое", cls: "bg-red-100 text-red-800" },
};

export const partnerApi = {
  login: (email: string, password: string) => call<{ token: string; user: PartnerUser }>({ resource: "auth", action: "login" }, "POST", { email, password }),
  me: () => call<{ user: PartnerUser }>({ resource: "auth" }),
  logout: () => call({ resource: "auth", action: "logout" }, "POST", {}),
  password: (old: string, next: string) => call({ resource: "auth", action: "password" }, "POST", { old, new: next }),
  overview: () => call<Overview>({ resource: "overview" }),
  leads: (p: { status?: string; q?: string }) => call<{ items: PartnerLead[] }>({ resource: "leads", ...p }),
  lead: (id: number) => call<{ item: PartnerLead; history: HistoryItem[] }>({ resource: "leads", id }),
  updateLead: (id: number, body: { status?: string; note?: string }) => call({ resource: "leads", id }, "POST", body),
  deals: () => call<{ items: PartnerDeal[] }>({ resource: "deals" }),
  deal: (id: number) => call<{ item: PartnerDeal; history: HistoryItem[] }>({ resource: "deals", id }),
  dealNote: (id: number, note: string) => call({ resource: "deals", id }, "POST", { note }),
  patients: (status?: string) => call<{ items: Patient[] }>({ resource: "patients", status }),
  patient: (id: number) => call<{ item: Patient; notes: PatientNote[] }>({ resource: "patients", id }),
  savePatient: (id: number | null, body: Partial<Patient>) => call<{ item: Patient }>({ resource: "patients", id }, "POST", body),
  addNote: (patient_id: number, text: string, condition?: string) => call<{ notes: PatientNote[] }>({ resource: "patient_notes" }, "POST", { patient_id, text, condition }),
};

export const partnerCrmApi = {
  access: (partner_id: number) => call<{ items: PartnerAccess[] }>({ resource: "access", partner_id }, "GET", undefined, true),
  createAccess: (body: { partner_id: number; name: string; email: string; phone?: string; password: string }) =>
    call<{ item: PartnerAccess }>({ resource: "access" }, "POST", body, true),
  updateAccess: (id: number, body: { is_active?: boolean; password?: string }) => call({ resource: "access", id }, "POST", body, true),
  patients: (p: { deal_id?: number; partner_id?: number; status?: string }) => call<{ items: Patient[] }>({ resource: "patients", ...p }, "GET", undefined, true),
  patient: (id: number) => call<{ item: Patient; notes: PatientNote[] }>({ resource: "patients", id }, "GET", undefined, true),
  addNote: (patient_id: number, text: string) => call<{ notes: PatientNote[] }>({ resource: "patient_notes" }, "POST", { patient_id, text }, true),
};
