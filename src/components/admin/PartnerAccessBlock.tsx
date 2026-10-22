import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { partnerCrmApi } from "@/lib/partner-api";
import { useAuth } from "./AuthContext";
import { fmtDate } from "./config";

const genPassword = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase();

const PartnerAccessBlock = ({ partnerId }: { partnerId: number }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const key = ["crm", "partner-access", partnerId];
  const { data } = useQuery({ queryKey: key, queryFn: () => partnerCrmApi.access(partnerId) });
  const [form, setForm] = useState<{ name: string; email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/partner`;

  const create = async () => {
    if (!form) return;
    setBusy(true);
    try {
      await partnerCrmApi.createAccess({ partner_id: partnerId, ...form });
      await navigator.clipboard.writeText(`Кабинет партнёра addict.clinic\n${link}\nЛогин: ${form.email}\nПароль: ${form.password}`).catch(() => null);
      toast.success("Доступ создан, данные для входа скопированы");
      setForm(null);
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: number, email: string, body: { is_active?: boolean; password?: string }) => {
    try {
      await partnerCrmApi.updateAccess(id, body);
      if (body.password) {
        await navigator.clipboard.writeText(`Кабинет партнёра addict.clinic\n${link}\nЛогин: ${email}\nПароль: ${body.password}`).catch(() => null);
        toast.success(`Новый пароль: ${body.password} — скопирован вместе с логином`);
      } else toast.success(body.is_active ? "Доступ включён" : "Доступ отключён");
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Icon name="KeyRound" size={13} />Доступ в кабинет партнёра</p>
        <a href="/partner" target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">/partner ↗</a>
      </div>
      {!data?.items.length && !form && <p className="text-sm text-muted-foreground">Сотрудники партнёра пока не имеют доступа.</p>}
      <ul className="flex flex-col gap-2">
        {data?.items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${a.is_active ? "" : "text-muted-foreground line-through"}`}>{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">{a.email} · {a.last_login_at ? `вход ${fmtDate(a.last_login_at)}` : "ещё не входил"}</p>
            </div>
            {isAdmin && (
              <>
                <button onClick={() => update(a.id, a.email, { password: genPassword() })} className="rounded-full bg-card px-2.5 py-1 text-xs hover:bg-background">Новый пароль</button>
                <button onClick={() => update(a.id, a.email, { is_active: !a.is_active })} className="rounded-full bg-card px-2.5 py-1 text-xs hover:bg-background">{a.is_active ? "Отключить" : "Включить"}</button>
              </>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && (form ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя сотрудника" />
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (логин)" />
          <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Пароль" />
          <div className="flex gap-2 sm:col-span-3">
            <button disabled={busy} onClick={create} className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">Создать доступ</button>
            <button onClick={() => setForm(null)} className="rounded-full bg-secondary px-4 py-1.5 text-sm">Отмена</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setForm({ name: "", email: "", password: genPassword() })} className="mt-3 flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/70">
          <Icon name="UserPlus" size={14} />Выдать доступ
        </button>
      ))}
    </section>
  );
};

export default PartnerAccessBlock;
