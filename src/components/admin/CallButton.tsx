import { useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/crm-api";

type Target = { label: string; phone: string; field?: string };

const digits = (v: string) => v.replace(/\D/g, "");
export const isPhone = (v?: string | null) => !!v && digits(v.replace(/\*/g, "0")).length >= 10 && !/@/.test(v);

const CallButton = ({ targets, leadId }: { targets: Target[]; leadId?: number }) => {
  const [busy, setBusy] = useState(false);
  const list = targets.filter((t, i, a) => isPhone(t.phone) && a.findIndex((x) => x.phone === t.phone) === i);
  if (!list.length) return null;

  const call = async (phone: string) => {
    setBusy(true);
    const target = list.find((t) => t.phone === phone);
    try {
      await api({ resource: "make_call" }, "POST", leadId ? { lead_id: leadId, field: target?.field || "contact" } : { phone });
      toast.success("Звоним вам на телефон — возьмите трубку, и АТС соединит с абонентом", { duration: 6000 });
    } catch (e) {
      toast.error((e as Error).message || "Не удалось позвонить");
    } finally {
      setTimeout(() => setBusy(false), 4000);
    }
  };

  const cls = "inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60";
  const inner = <>{busy ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Phone" size={14} />}Позвонить</>;

  if (list.length === 1) {
    return <button className={cls} disabled={busy} onClick={() => call(list[0].phone)} title={list[0].phone}>{inner}</button>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cls} disabled={busy}>{inner}<Icon name="ChevronDown" size={14} /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Кому позвонить</DropdownMenuLabel>
        {list.map((t) => (
          <DropdownMenuItem key={t.phone} onClick={() => call(t.phone)} className="flex flex-col items-start gap-0">
            <span className="text-sm">{t.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{t.phone}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CallButton;
