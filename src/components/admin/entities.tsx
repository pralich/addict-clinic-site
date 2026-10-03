import type { ReactNode } from "react";
import type { Field } from "./EntityForm";
import StatusBadge from "./StatusBadge";
import {
  CLIENT_STATUS, DEAL_STAGES, LEAD_STATUS, PARTNER_STATUS, PARTNER_TYPES, SOURCES,
  fmtDate, money, toOptions, type StatusMap,
} from "./config";

export type Column = { key: string; label: string; render?: (row: any) => ReactNode; className?: string };

export type EntityDef = {
  resource: string;
  title: string;
  single: string;
  icon: string;
  titleKey: string;
  statusKey: string;
  statusMap: StatusMap;
  columns: Column[];
  fields: Field[];
  details: { key: string; label: string; render?: (row: any) => ReactNode }[];
  filters?: ("manager" | "partner")[];
};

const sourceLabel = (r: any) => SOURCES[r.source] || r.source || "—";

export const ENTITY_DEFS: Record<string, EntityDef> = {
  leads: {
    resource: "leads",
    title: "Лиды",
    single: "лид",
    icon: "Inbox",
    titleKey: "name",
    statusKey: "status",
    statusMap: LEAD_STATUS,
    filters: ["manager", "partner"],
    columns: [
      { key: "name", label: "Имя", render: (r) => <span className="font-medium">{r.name || "Аноним"}</span> },
      { key: "contact", label: "Контакт" },
      { key: "topic", label: "Тема" },
      { key: "status", label: "Статус", render: (r) => <StatusBadge map={LEAD_STATUS} value={r.status} /> },
      { key: "source", label: "Источник", render: sourceLabel },
      { key: "manager_name", label: "Ответственный" },
      { key: "created_at", label: "Создан", render: (r) => fmtDate(r.created_at, true) },
    ],
    fields: [
      { name: "name", label: "Имя / псевдоним" },
      { name: "contact", label: "Телефон или мессенджер", required: true },
      { name: "topic", label: "Тема обращения" },
      { name: "status", label: "Статус", type: "select", options: toOptions(LEAD_STATUS), required: true },
      { name: "source", label: "Источник", type: "select", options: toOptions(SOURCES), required: true },
      { name: "manager_id", label: "Ответственный", type: "ref", ref: "users" },
      { name: "partner_id", label: "Партнёр", type: "ref", ref: "partners" },
      { name: "client_id", label: "Клиент", type: "ref", ref: "clients" },
      { name: "message", label: "Комментарий", type: "textarea" },
    ],
    details: [
      { key: "contact", label: "Контакт" },
      { key: "topic", label: "Тема" },
      { key: "source", label: "Источник", render: sourceLabel },
      { key: "message", label: "Сообщение" },
      { key: "created_at", label: "Создан", render: (r) => fmtDate(r.created_at, true) },
    ],
  },
  deals: {
    resource: "deals",
    title: "Сделки",
    single: "сделку",
    icon: "Handshake",
    titleKey: "title",
    statusKey: "stage",
    statusMap: DEAL_STAGES,
    filters: ["manager", "partner"],
    columns: [
      { key: "title", label: "Название", render: (r) => <span className="font-medium">{r.title}</span> },
      { key: "client_name", label: "Клиент" },
      { key: "stage", label: "Этап", render: (r) => <StatusBadge map={DEAL_STAGES} value={r.stage} /> },
      { key: "amount", label: "Сумма", render: (r) => money(r.amount), className: "text-right whitespace-nowrap" },
      { key: "program", label: "Программа" },
      { key: "manager_name", label: "Ответственный" },
      { key: "expected_close", label: "План закрытия", render: (r) => fmtDate(r.expected_close) },
    ],
    fields: [
      { name: "title", label: "Название", required: true, full: true },
      { name: "client_id", label: "Клиент", type: "ref", ref: "clients" },
      { name: "stage", label: "Этап", type: "select", options: toOptions(DEAL_STAGES), required: true },
      { name: "program", label: "Программа лечения", placeholder: "Детокс, стационар 21 день…" },
      { name: "amount", label: "Сумма, ₽", type: "number" },
      { name: "manager_id", label: "Ответственный", type: "ref", ref: "users" },
      { name: "partner_id", label: "Партнёр", type: "ref", ref: "partners" },
      { name: "expected_close", label: "Плановая дата закрытия", type: "date" },
      { name: "notes", label: "Заметки", type: "textarea" },
    ],
    details: [
      { key: "amount", label: "Сумма", render: (r) => money(r.amount) },
      { key: "program", label: "Программа" },
      { key: "expected_close", label: "План закрытия", render: (r) => fmtDate(r.expected_close) },
      { key: "closed_at", label: "Закрыта", render: (r) => fmtDate(r.closed_at) },
      { key: "notes", label: "Заметки" },
    ],
  },
  clients: {
    resource: "clients",
    title: "Клиенты",
    single: "клиента",
    icon: "Users",
    titleKey: "full_name",
    statusKey: "status",
    statusMap: CLIENT_STATUS,
    filters: ["manager", "partner"],
    columns: [
      { key: "full_name", label: "ФИО / псевдоним", render: (r) => (
        <span className="font-medium">{r.full_name}{r.is_anonymous && <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">аноним</span>}</span>
      ) },
      { key: "phone", label: "Телефон" },
      { key: "status", label: "Статус", render: (r) => <StatusBadge map={CLIENT_STATUS} value={r.status} /> },
      { key: "deals_count", label: "Сделок", className: "text-center" },
      { key: "revenue", label: "Выручка", render: (r) => money(r.revenue), className: "text-right whitespace-nowrap" },
      { key: "manager_name", label: "Ответственный" },
      { key: "created_at", label: "Добавлен", render: (r) => fmtDate(r.created_at) },
    ],
    fields: [
      { name: "full_name", label: "ФИО или псевдоним", required: true },
      { name: "is_anonymous", label: "Анонимный клиент", type: "switch" },
      { name: "phone", label: "Телефон", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "birth_date", label: "Дата рождения", type: "date" },
      { name: "status", label: "Статус", type: "select", options: toOptions(CLIENT_STATUS), required: true },
      { name: "source", label: "Источник", type: "select", options: toOptions(SOURCES), required: true },
      { name: "manager_id", label: "Ответственный", type: "ref", ref: "users" },
      { name: "partner_id", label: "Партнёр", type: "ref", ref: "partners" },
      { name: "notes", label: "Заметки", type: "textarea" },
    ],
    details: [
      { key: "phone", label: "Телефон" },
      { key: "email", label: "Email" },
      { key: "birth_date", label: "Дата рождения", render: (r) => fmtDate(r.birth_date) },
      { key: "source", label: "Источник", render: sourceLabel },
      { key: "is_anonymous", label: "Анонимно", render: (r) => (r.is_anonymous ? "Да" : "Нет") },
      { key: "notes", label: "Заметки" },
    ],
  },
  partners: {
    resource: "partners",
    title: "Партнёры",
    single: "партнёра",
    icon: "Building2",
    titleKey: "name",
    statusKey: "status",
    statusMap: PARTNER_STATUS,
    columns: [
      { key: "name", label: "Название", render: (r) => <span className="font-medium">{r.name}</span> },
      { key: "type", label: "Тип", render: (r) => PARTNER_TYPES[r.type] || r.type },
      { key: "contact_person", label: "Контактное лицо" },
      { key: "phone", label: "Телефон" },
      { key: "commission_percent", label: "Комиссия", render: (r) => `${Number(r.commission_percent)}%`, className: "text-center" },
      { key: "clients_count", label: "Клиентов", className: "text-center" },
      { key: "revenue", label: "Выручка", render: (r) => money(r.revenue), className: "text-right whitespace-nowrap" },
      { key: "status", label: "Статус", render: (r) => <StatusBadge map={PARTNER_STATUS} value={r.status} /> },
    ],
    fields: [
      { name: "name", label: "Название", required: true },
      { name: "type", label: "Тип", type: "select", options: toOptions(PARTNER_TYPES), required: true },
      { name: "contact_person", label: "Контактное лицо" },
      { name: "phone", label: "Телефон", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "commission_percent", label: "Комиссия, %", type: "number" },
      { name: "status", label: "Статус", type: "select", options: toOptions(PARTNER_STATUS), required: true },
      { name: "notes", label: "Заметки", type: "textarea" },
    ],
    details: [
      { key: "type", label: "Тип", render: (r) => PARTNER_TYPES[r.type] || r.type },
      { key: "contact_person", label: "Контактное лицо" },
      { key: "phone", label: "Телефон" },
      { key: "email", label: "Email" },
      { key: "commission_percent", label: "Комиссия", render: (r) => `${Number(r.commission_percent)}%` },
      { key: "notes", label: "Заметки" },
    ],
  },
};

export const DEFAULTS: Record<string, Record<string, any>> = {
  leads: { status: "new", source: "phone" },
  deals: { stage: "new", amount: 0 },
  clients: { status: "active", source: "site" },
  partners: { status: "active", type: "agent", commission_percent: 10 },
};
