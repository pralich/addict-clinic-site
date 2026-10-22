import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { familyApi, fmtDateTime, fmtNum, fmtRub, type BillingOrder } from "@/lib/family-api";
import { useFamilyAuth } from "./FamilyAuth";
import { fmtMskDate } from "@/lib/msk";
import { reachGoal, reachGoalOnce } from "@/lib/goals";

const PLAN_META: Record<string, { icon: string; features: string[]; accent?: boolean }> = {
  psychologist: {
    icon: "MessageCircleHeart",
    features: ["Личные консультации психолога клиники", "Разбор вашей ситуации и план действий", "Ответы на вопросы в приоритете"],
  },
  family_care: {
    icon: "ShieldPlus",
    accent: true,
    features: ["Персональное ведение семьи специалистом", "Мотивация близкого на лечение", "Экстренное консультирование 24/7", "Сопровождение на всех этапах"],
  },
};

const STATUS: Record<BillingOrder["status"], { label: string; cls: string }> = {
  paid: { label: "Оплачено", cls: "bg-emerald-500/10 text-emerald-700" },
  pending: { label: "Ожидает оплаты", cls: "bg-amber-500/10 text-amber-700" },
  canceled: { label: "Отменён", cls: "bg-secondary text-muted-foreground" },
};

const BillingSection = () => {
  const { refresh } = useFamilyAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState(3);
  const { data, isLoading } = useQuery({ queryKey: ["family", "billing"], queryFn: familyApi.billing });

  const orderNumber = params.get("order");
  const { data: returned } = useQuery({
    queryKey: ["family", "billing", "order", orderNumber],
    queryFn: () => familyApi.billingOrder(orderNumber!),
    enabled: !!orderNumber,
    refetchInterval: (q) => (q.state.data?.order.status === "pending" ? 4000 : false),
  });

  useEffect(() => {
    if (returned?.order.status === "paid") {
      const o = returned.order;
      reachGoalOnce(o.order_number, "family_paid", { order_id: o.order_number, order_price: Number(o.amount), currency: "RUB", product: o.product_code });
    }
    if (returned?.order.status && returned.order.status !== "pending") {
      qc.invalidateQueries({ queryKey: ["family", "billing"] });
      refresh();
    }
  }, [returned?.order, qc, refresh]);

  const pay = async (product: string, thousands?: number) => {
    const key = thousands ? `tokens-${thousands}` : product;
    setBusy(key);
    try {
      const r = await familyApi.pay({ product, thousands, return_url: `${window.location.origin}/family?s=billing` });
      reachGoal("family_pay", { product, order_id: r.order_number });
      window.location.href = r.payment_url;
    } catch (e) {
      toast({ title: "Не удалось перейти к оплате", description: (e as Error).message, variant: "destructive" });
      setBusy(null);
    }
  };

  if (isLoading || !data) return <div className="flex justify-center py-20"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;

  const active = Object.fromEntries(data.subscriptions.map((s) => [s.plan, s.ends_at]));
  const price = data.catalog.token_price_per_1000;

  return (
    <div className="flex flex-col gap-6">
      {returned?.order && (
        <div className={`flex items-start gap-3 rounded-2xl p-4 ${returned.order.status === "paid" ? "bg-emerald-500/10" : returned.order.status === "pending" ? "bg-amber-500/10" : "bg-card"}`}>
          <Icon name={returned.order.status === "paid" ? "CircleCheck" : returned.order.status === "pending" ? "Loader2" : "CircleX"} size={20}
            className={returned.order.status === "paid" ? "text-emerald-600" : returned.order.status === "pending" ? "animate-spin text-amber-600" : "text-muted-foreground"} />
          <div className="flex-1">
            <p className="font-medium">
              {returned.order.status === "paid" ? "Спасибо! Оплата прошла успешно" : returned.order.status === "pending" ? "Проверяем оплату…" : "Оплата не завершена"}
            </p>
            <p className="text-sm text-muted-foreground">Заказ {returned.order.order_number} · {fmtRub(returned.order.amount)}</p>
          </div>
          <button onClick={() => setParams({ s: "billing" })} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
        </div>
      )}

      {!data.payments_enabled && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 p-4 text-sm">
          <Icon name="Info" size={18} className="shrink-0 text-amber-600" />
          Онлайн-оплата подключается. Скоро здесь можно будет оплатить тарифы картой или через СБП.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-ink-foreground">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm text-white/60"><Icon name="Sparkles" size={15} />Баланс ИИ-токенов</p>
            <p className="mt-3 font-heading text-[2.6em] font-semibold leading-none tracking-[-0.04em]">{fmtNum(data.balance)}</p>
            <p className="mt-2 text-sm text-white/60">≈ {fmtRub(Math.floor((data.balance / 1000) * price))} · {fmtRub(price)} за 1 000 токенов</p>
            <p className="mt-5 text-xs leading-relaxed text-white/50">Токены списываются за работу ИИ-психолога — по фактическому объёму текста в диалоге.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6">
          <p className="font-heading text-lg font-semibold">Пополнить баланс</p>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {data.catalog.token_packs.map((p) => (
              <button key={p.thousands} disabled={!!busy || !data.payments_enabled} onClick={() => pay("tokens", p.thousands)}
                className="flex flex-col items-start rounded-xl border bg-background p-3 text-left transition-colors hover:border-primary disabled:opacity-60">
                <span className="font-heading text-lg font-semibold">{fmtNum(p.tokens)}</span>
                <span className="text-xs text-muted-foreground">токенов</span>
                <span className="mt-2 text-sm font-medium text-primary">
                  {busy === `tokens-${p.thousands}` ? <Icon name="Loader2" size={14} className="animate-spin" /> : fmtRub(p.price)}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-secondary/60 p-2 pl-4">
            <span className="text-sm text-muted-foreground">Свой объём:</span>
            <div className="flex items-center rounded-lg bg-background">
              <button onClick={() => setCustom((v) => Math.max(1, v - 1))} className="p-2 text-muted-foreground hover:text-foreground"><Icon name="Minus" size={14} /></button>
              <span className="w-16 text-center text-sm font-medium">{fmtNum(custom * 1000)}</span>
              <button onClick={() => setCustom((v) => Math.min(1000, v + 1))} className="p-2 text-muted-foreground hover:text-foreground"><Icon name="Plus" size={14} /></button>
            </div>
            <button disabled={!!busy || !data.payments_enabled} onClick={() => pay("tokens", custom)}
              className="ml-auto rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ink-foreground disabled:opacity-60">
              {busy === `tokens-${custom}` ? "Переход…" : `Оплатить ${fmtRub(custom * price)}`}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">Тарифы поддержки</h2>
        <p className="mt-1 text-sm text-muted-foreground">Подписка на 30 дней. Продление — повторной оплатой, срок добавляется к текущему.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.catalog.plans.map((p) => {
            const meta = PLAN_META[p.code] ?? { icon: "Star", features: [] };
            const until = active[p.code];
            return (
              <div key={p.code} className={`relative flex flex-col rounded-2xl p-6 ${meta.accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {meta.accent && <span className="absolute right-5 top-5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">Максимальная поддержка</span>}
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.accent ? "bg-white/15" : "bg-secondary text-primary"}`}><Icon name={meta.icon} size={20} /></span>
                <p className="mt-4 font-heading text-lg font-semibold leading-snug">{p.title}</p>
                <p className="mt-3 font-heading text-[2em] font-semibold tracking-[-0.03em]">
                  {fmtRub(p.price)}<span className={`ml-1 text-sm font-normal ${meta.accent ? "text-white/70" : "text-muted-foreground"}`}>/ 30 дней</span>
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {meta.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Icon name="Check" size={16} className={`mt-0.5 shrink-0 ${meta.accent ? "text-white" : "text-primary"}`} />{f}
                    </li>
                  ))}
                </ul>
                {until && (
                  <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${meta.accent ? "bg-white/15" : "bg-emerald-500/10 text-emerald-700"}`}>
                    Активна до {fmtMskDate(until, { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <button disabled={!!busy || !data.payments_enabled} onClick={() => pay(p.code)}
                  className={`mt-4 h-11 rounded-xl font-medium transition-opacity hover:opacity-90 disabled:opacity-60 ${meta.accent ? "bg-white text-primary" : "bg-ink text-ink-foreground"}`}>
                  {busy === p.code ? "Переход к оплате…" : until ? "Продлить" : "Оформить"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {data.orders.length > 0 && (
        <div className="rounded-2xl bg-card p-6">
          <p className="font-heading text-lg font-semibold">История платежей</p>
          <div className="mt-3 divide-y">
            {data.orders.map((o) => (
              <div key={o.order_number} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.title || o.product_code}</p>
                  <p className="text-xs text-muted-foreground">{o.order_number} · {fmtDateTime(o.paid_at || o.created_at)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                <span className="w-24 text-right font-medium">{fmtRub(o.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Оплата проходит через защищённую страницу ЮKassa. Чек придёт на почту, указанную при регистрации.</p>
    </div>
  );
};

export default BillingSection;