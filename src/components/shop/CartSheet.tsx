import { useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { checkout, rub, useCart } from "@/lib/shop";
import ConsentCheckbox from "@/components/legal/ConsentCheckbox";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; delivery?: { price: number; free_from: number } };

const field = "h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-foreground/30";

const CartSheet = ({ open, onOpenChange, delivery = { price: 390, free_from: 5000 } }: Props) => {
  const { lines, setQty, remove, subtotal, count } = useCart();
  const [step, setStep] = useState<"cart" | "form">("cart");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [offer, setOffer] = useState(false);
  const [agreeErr, setAgreeErr] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", comment: "" });
  const physical = lines.some((l) => !l.digital);
  const ship = physical && subtotal < delivery.free_from ? delivery.price : 0;
  const total = subtotal + ship;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || !offer) {
      setAgreeErr(true);
      toast.error("Примите оферту и дайте согласие на обработку данных");
      return;
    }
    setBusy(true);
    try {
      const r = await checkout({
        ...form,
        consent,
        offer,
        items: lines.map((l) => ({ id: l.id, option: l.raw, qty: l.qty })),
        return_url: `${window.location.origin}/shop`,
      });
      window.location.href = r.payment_url;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setStep("cart"); }}>
      <SheetContent side="right" className="flex w-full flex-col bg-background p-0 sm:max-w-[440px]">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          {step === "form" && (
            <button onClick={() => setStep("cart")} className="-ml-1 rounded-lg p-1 hover:bg-secondary" aria-label="Назад"><Icon name="ArrowLeft" size={18} /></button>
          )}
          <SheetTitle className="font-heading text-lg">{step === "cart" ? `Корзина${count ? ` · ${count}` : ""}` : "Оформление"}</SheetTitle>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary"><Icon name="ShoppingBag" size={28} className="text-muted-foreground" /></span>
            <p className="font-medium">Корзина пуста</p>
            <p className="text-sm text-muted-foreground">Загляните в сертификаты — это бережный подарок тому, кому нужна поддержка.</p>
          </div>
        ) : step === "cart" ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {physical && subtotal < delivery.free_from && (
                <div className="mb-4 rounded-xl bg-secondary p-3 text-sm">
                  До бесплатной доставки — <b>{rub(delivery.free_from - subtotal)}</b>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (subtotal / delivery.free_from) * 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {lines.map((l) => (
                  <div key={l.key} className="flex gap-3 rounded-2xl bg-card p-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">{l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm font-medium leading-snug">{l.title}</p>
                        <button onClick={() => remove(l.key)} className="text-muted-foreground hover:text-foreground" aria-label="Удалить"><Icon name="X" size={16} /></button>
                      </div>
                      {l.option && <p className="text-xs text-muted-foreground">{l.option}</p>}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex h-8 items-center rounded-lg border">
                          <button onClick={() => setQty(l.key, l.qty - 1)} className="flex h-full w-8 items-center justify-center" aria-label="Меньше"><Icon name="Minus" size={14} /></button>
                          <span className="w-5 text-center text-sm tabular-nums">{l.qty}</span>
                          <button onClick={() => setQty(l.key, l.qty + 1)} className="flex h-full w-8 items-center justify-center" aria-label="Больше"><Icon name="Plus" size={14} /></button>
                        </div>
                        <span className="font-medium">{rub(l.price * l.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t p-5">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Товары</span><span>{rub(subtotal)}</span></div>
                {physical && <div className="flex justify-between"><span className="text-muted-foreground">Доставка</span><span>{ship ? rub(ship) : "бесплатно"}</span></div>}
                <div className="mt-1 flex justify-between font-heading text-lg font-semibold"><span>Итого</span><span>{rub(total)}</span></div>
              </div>
              <button onClick={() => setStep("form")} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground hover:opacity-90">
                Оформить заказ<Icon name="ArrowRight" size={16} />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={pay} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
              <input required value={form.name} onChange={set("name")} placeholder="Имя или псевдоним" className={field} />
              <input required type="email" value={form.email} onChange={set("email")} placeholder="Email — для чека и сертификата" className={field} />
              <input value={form.phone} onChange={set("phone")} placeholder="Телефон (необязательно)" className={field} />
              {physical && <textarea required minLength={10} value={form.address} onChange={set("address")} placeholder="Адрес доставки: город, улица, дом, квартира" rows={3} className={`${field} h-auto py-3`} />}
              <textarea value={form.comment} onChange={set("comment")} placeholder="Комментарий: например, имя получателя сертификата" rows={2} className={`${field} h-auto py-3`} />
              <p className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <Icon name="ShieldCheck" size={15} className="mt-0.5 shrink-0 text-primary" />
                Упаковка и выписка без упоминания клиники. Данные используются только для доставки и чека.
              </p>
              <ConsentCheckbox kind="offer" checked={offer} error={agreeErr && !offer} onChange={(v) => { setOffer(v); setAgreeErr(false); }} />
              <ConsentCheckbox checked={consent} error={agreeErr && !consent} onChange={(v) => { setConsent(v); setAgreeErr(false); }} />
            </div>
            <div className="border-t p-5">
              <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {busy ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="CreditCard" size={18} />}
                Оплатить {rub(total)}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Оплата картой или СБП через ЮKassa</p>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
