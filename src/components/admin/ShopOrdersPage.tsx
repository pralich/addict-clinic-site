import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtMsk } from "@/lib/msk";

type Order = {
  id: number;
  order_number: string;
  user_name: string | null;
  user_email: string;
  user_phone: string | null;
  amount: number;
  status: string;
  delivery_address: string | null;
  comment: string | null;
  created_at: string;
  paid_at: string | null;
  items: { name: string; qty: number; price: number }[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Оплачен", cls: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Ждёт оплаты", cls: "bg-amber-100 text-amber-800" },
  canceled: { label: "Отменён", cls: "bg-secondary text-muted-foreground" },
};

const rub = (n: number) => `${Math.round(Number(n)).toLocaleString("ru-RU")} ₽`;
const dt = (s: string | null) => (s ? fmtMsk(s, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

const ShopOrdersPage = () => {
  const [status, setStatus] = useState("paid");
  const { data, isLoading } = useQuery<{ items: Order[]; stats: { paid: number; revenue: number; today: number } }>({
    queryKey: ["crm", "shop_orders", status],
    queryFn: () => api({ resource: "shop_orders", status }),
    refetchInterval: 60000,
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Заказы магазина</h1>
          <p className="text-sm text-muted-foreground">Мерч, сертификаты и литература</p>
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {[["paid", "Оплаченные"], ["pending", "Ждут оплаты"], ["all", "Все"]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3.5 py-1.5 text-sm ${status === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>

      {data?.stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "CircleCheck", l: "Оплачено заказов", v: data.stats.paid },
            { icon: "Wallet", l: "Выручка магазина", v: rub(data.stats.revenue) },
            { icon: "Clock", l: "За последние сутки", v: data.stats.today },
          ].map((s) => (
            <div key={s.l} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <Icon name={s.icon} size={20} className="text-primary" />
              <div><p className="text-xs text-muted-foreground">{s.l}</p><p className="font-heading text-xl font-semibold">{s.v}</p></div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 flex justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
      ) : !data?.items.length ? (
        <p className="mt-16 text-center text-muted-foreground">Заказов пока нет</p>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {data.items.map((o) => (
            <div key={o.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">{o.order_number}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[o.status]?.cls || "bg-secondary"}`}>{STATUS[o.status]?.label || o.status}</span>
                {o.delivery_address && <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs"><Icon name="Truck" size={12} />Доставка</span>}
                <span className="ml-auto text-xs text-muted-foreground">{dt(o.paid_at || o.created_at)}</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {o.items.map((i, k) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="text-foreground/80">{i.name}{i.qty > 1 ? ` × ${i.qty}` : ""}</span>
                    <span className="shrink-0 tabular-nums">{rub(i.price * i.qty)}</span>
                  </li>
                ))}
                <li className="mt-1 flex justify-between border-t pt-2 font-medium"><span>Итого</span><span>{rub(o.amount)}</span></li>
              </ul>
              <div className="mt-3 flex flex-col gap-1 rounded-lg bg-secondary/60 p-3 text-sm">
                <p className="font-medium">{o.user_name || "Без имени"}</p>
                <a href={`mailto:${o.user_email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Icon name="Mail" size={13} />{o.user_email}</a>
                {o.user_phone && <a href={`tel:${o.user_phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Icon name="Phone" size={13} />{o.user_phone}</a>}
                {o.delivery_address && <p className="flex items-start gap-1.5 text-muted-foreground"><Icon name="MapPin" size={13} className="mt-1 shrink-0" />{o.delivery_address}</p>}
                {o.comment && <p className="flex items-start gap-1.5 text-muted-foreground"><Icon name="MessageSquare" size={13} className="mt-1 shrink-0" />{o.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopOrdersPage;
