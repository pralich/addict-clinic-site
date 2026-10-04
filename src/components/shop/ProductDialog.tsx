import { useEffect, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { optionLabel, productPrice, rub, SHOP_CATEGORIES, useCart, type Product } from "@/lib/shop";

type Props = { product: Product | null; onClose: () => void; onAdded: () => void };

const ProductDialog = ({ product: p, onClose, onAdded }: Props) => {
  const { add } = useCart();
  const [option, setOption] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setOption(p?.slug === "cert-amount" ? "10000" : "");
    setQty(1);
  }, [p]);

  if (!p) return null;
  const price = productPrice(p, option);
  const needOption = p.options.length > 0 && !option;

  const submit = () => {
    if (needOption) return toast.error(p.category === "merch" ? "Выберите размер" : "Выберите вариант");
    add(p, option, qty);
    toast.success("Добавлено в корзину", { action: { label: "Корзина", onClick: onAdded } });
    onClose();
  };

  return (
    <Dialog open={!!p} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-[880px] overflow-y-auto p-0 sm:rounded-3xl">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-secondary md:aspect-auto">
            {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
            {p.badge && <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{p.badge}</span>}
          </div>
          <div className="flex flex-col p-6 md:p-8">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Icon name={SHOP_CATEGORIES[p.category].icon} size={13} />{SHOP_CATEGORIES[p.category].label}
            </p>
            <DialogTitle className="mt-2 font-heading text-2xl font-semibold leading-tight tracking-tight">{p.title}</DialogTitle>
            {p.subtitle && <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-semibold">{rub(price)}</span>
              {p.old_price && p.slug !== "cert-amount" && <span className="text-muted-foreground line-through">{rub(p.old_price)}</span>}
            </div>
            {p.description && <p className="mt-4 text-[0.95em] leading-relaxed text-foreground/80">{p.description}</p>}

            {p.options.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">{p.category === "merch" ? "Размер" : p.slug === "cert-amount" ? "Номинал" : "Формат"}</p>
                <div className="flex flex-wrap gap-2">
                  {p.options.map((o) => (
                    <button key={o} onClick={() => setOption(o)}
                      className={`h-10 min-w-[48px] rounded-xl border px-3.5 text-sm font-medium transition-colors ${option === o ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-foreground/30"}`}>
                      {optionLabel(p, o)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {p.is_digital ? (
                <><span className="flex items-center gap-1.5"><Icon name="Mail" size={13} />Придёт на почту сразу</span><span className="flex items-center gap-1.5"><Icon name="CalendarCheck" size={13} />Действует 12 месяцев</span></>
              ) : (
                <><span className="flex items-center gap-1.5"><Icon name="Truck" size={13} />Доставка 2–5 дней</span><span className="flex items-center gap-1.5"><Icon name="Package" size={13} />Без логотипа на упаковке</span></>
              )}
            </div>

            <div className="mt-auto flex gap-2 pt-6">
              <div className="flex h-12 items-center rounded-xl border bg-card">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-full w-10 items-center justify-center" aria-label="Меньше"><Icon name="Minus" size={16} /></button>
                <span className="w-6 text-center font-medium tabular-nums">{qty}</span>
                <button onClick={() => setQty(Math.min(20, qty + 1))} className="flex h-full w-10 items-center justify-center" aria-label="Больше"><Icon name="Plus" size={16} /></button>
              </div>
              <button onClick={submit} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground hover:opacity-90">
                <Icon name="ShoppingBag" size={18} />В корзину · {rub(price * qty)}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;
