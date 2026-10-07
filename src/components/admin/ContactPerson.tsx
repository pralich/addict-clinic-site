import Icon from "@/components/ui/icon";
import { REP_RELATIONS } from "./config";

type Props = { item: Record<string, any>; onEdit: () => void };

const ContactPerson = ({ item, onEdit }: Props) => {
  const filled = item.rep_name || item.rep_phone || item.rep_email || item.rep_relation;
  const phoneHref = item.rep_phone ? `tel:${String(item.rep_phone).replace(/[^\d+]/g, "")}` : null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Контактное лицо</p>
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
          {(item.rep_phone || item.rep_email) && (
            <div className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-sm">
              {item.rep_phone && (
                <a href={phoneHref!} className="flex items-center gap-2 hover:text-primary">
                  <Icon name="Phone" size={14} className="text-muted-foreground" />{item.rep_phone}
                </a>
              )}
              {item.rep_email && (
                <a href={`mailto:${item.rep_email}`} className="flex items-center gap-2 break-all hover:text-primary">
                  <Icon name="Mail" size={14} className="text-muted-foreground" />{item.rep_email}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactPerson;
