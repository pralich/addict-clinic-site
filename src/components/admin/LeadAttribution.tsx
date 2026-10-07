import Icon from "@/components/ui/icon";
import { CHANNELS, LEAD_FORMS, fmtDate } from "./config";

type Lead = Record<string, any>;

const path = (url?: string | null) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname) || "/";
  } catch {
    return url;
  }
};

const host = (url?: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const DEVICES: Record<string, string> = { mobile: "Телефон", tablet: "Планшет", desktop: "Компьютер" };

const LeadAttribution = ({ lead }: { lead: Lead }) => {
  if (!lead.channel && !lead.page_url && !lead.utm_source) return null;
  const ch = CHANNELS[lead.channel] || CHANNELS.unknown;
  const pagePath = path(lead.page_url);
  const landingPath = path(lead.landing_url);

  const rows: [string, React.ReactNode][] = [
    ["Форма", lead.form ? LEAD_FORMS[lead.form] || lead.form : null],
    [
      "Страница заявки",
      lead.page_url ? (
        <a href={lead.page_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          {lead.page_title ? lead.page_title.replace(/\s[—|-]\s.*$/, "") : pagePath}
        </a>
      ) : null,
    ],
    ["Вход на сайт", landingPath && landingPath !== pagePath ? <a href={lead.landing_url} target="_blank" rel="noreferrer" className="hover:underline">{landingPath}</a> : null],
    ["Пришёл с", host(lead.referrer)],
    ["Источник", lead.utm_source],
    ["Тип трафика", lead.utm_medium],
    ["Кампания", lead.utm_campaign],
    ["Объявление", lead.utm_content],
    ["Ключевая фраза", lead.utm_term],
    ["Клик", lead.click_id ? <span className="font-mono text-xs">{lead.click_id.split("=")[0]}</span> : null],
    ["Устройство", lead.device ? DEVICES[lead.device] || lead.device : null],
    ["Первый визит", lead.first_visit_at ? fmtDate(lead.first_visit_at, true) : null],
  ];

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Откуда пришёл</p>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ch.paid ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
            <Icon name={ch.icon} size={17} />
          </span>
          <div>
            <p className="font-medium leading-tight">{ch.label}</p>
            <p className="text-xs text-muted-foreground">{ch.paid ? "Платная реклама" : "Бесплатный канал"}</p>
          </div>
        </div>
        <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default LeadAttribution;
