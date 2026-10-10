import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { REP_RELATIONS } from "./config";

type Props = { item: Record<string, any>; onEdit: () => void };

const telHref = (v: string) => `tel:${String(v).replace(/[^\d+]/g, "")}`;

const messengerHref = (v: string) => {
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("@")) return `https://t.me/${s.slice(1)}`;
  return null;
};

type Row = { icon: string; value?: string | null; href?: string | null; hint?: string };

const Rows = ({ rows }: { rows: Row[] }) => (
  <div className="flex flex-col gap-1.5 text-sm">
    {rows.filter((r) => r.value).map((r) => {
      const body = (
        <>
          <Icon name={r.icon} size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-words">{r.value}{r.hint && <span className="ml-1.5 text-xs text-muted-foreground">{r.hint}</span>}</span>
        </>
      );
      return r.href ? (
        <a key={r.icon} href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-start gap-2 hover:text-primary">{body}</a>
      ) : (
        <p key={r.icon} className="flex items-start gap-2">{body}</p>
      );
    })}
  </div>
);

const Title = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</p>
);

export const ContactInfo = ({ data, onEdit, onOpenClient }: { data: Record<string, any> | null | undefined; onEdit?: () => void; onOpenClient?: () => void }) => {
  const rows: Row[] = data
    ? [
        { icon: "Phone", value: data.phone, href: data.phone ? telHref(data.phone) : null },
        { icon: "Mail", value: data.email, href: data.email ? `mailto:${data.email}` : null },
        { icon: "Send", value: data.messenger, href: data.messenger ? messengerHref(data.messenger) : null },
        { icon: "Clock", value: data.contact_time, hint: data.contact_time ? "удобное время" : undefined },
        { icon: "MapPin", value: data.address },
      ]
    : [];
  const filled = rows.some((r) => r.value);
  const action = onEdit || onOpenClient;

  return (
    <div>
      <Title>Контактная информация{onOpenClient ? " клиента" : ""}</Title>
      {!filled ? (
        <button onClick={action} disabled={!action} className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none">
          <Icon name="Contact" size={18} />
          {!data ? "К сделке не привязан клиент — укажите его, чтобы видеть контакты" : onOpenClient ? "У клиента не указаны контакты — открыть карточку клиента" : "Добавить телефон, почту, мессенджер или адрес"}
        </button>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0 flex-1"><Rows rows={rows} /></div>
          {action && (
            <button onClick={action} className="text-muted-foreground hover:text-foreground" title={onEdit ? "Изменить" : "Открыть клиента"}>
              <Icon name={onEdit ? "Pencil" : "ArrowUpRight"} size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ContactPerson = ({ item, onEdit }: Props) => {
  const filled = item.rep_name || item.rep_phone || item.rep_email || item.rep_relation || item.rep_messenger || item.rep_note;

  return (
    <div>
      <Title>Контактное лицо</Title>
      {!filled ? (
        <button onClick={onEdit} className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
          <Icon name="UserPlus" size={18} />
          Добавить представителя — родственника или того, кто обратился за пациента
        </button>
      ) : (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading font-semibold">
              {item.rep_name ? String(item.rep_name).slice(0, 1).toUpperCase() : <Icon name="UserRound" size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.rep_name || "Имя не указано"}</p>
              <p className="text-xs text-muted-foreground">{item.rep_relation ? REP_RELATIONS[item.rep_relation] || item.rep_relation : "Кем является — не указано"}</p>
            </div>
            <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Изменить"><Icon name="Pencil" size={15} /></button>
          </div>
          {(item.rep_phone || item.rep_email || item.rep_messenger) && (
            <div className="mt-3 border-t pt-3">
              <Rows rows={[
                { icon: "Phone", value: item.rep_phone, href: item.rep_phone ? telHref(item.rep_phone) : null },
                { icon: "Mail", value: item.rep_email, href: item.rep_email ? `mailto:${item.rep_email}` : null },
                { icon: "Send", value: item.rep_messenger, href: item.rep_messenger ? messengerHref(item.rep_messenger) : null },
              ]} />
            </div>
          )}
          {item.rep_note && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{item.rep_note}</p>}
        </div>
      )}
    </div>
  );
};

export default ContactPerson;
