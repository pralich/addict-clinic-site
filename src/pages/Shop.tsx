import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import ProductDialog from "@/components/shop/ProductDialog";
import CartSheet from "@/components/shop/CartSheet";
import { fetchOrder, fetchProducts, rub, SHOP_CATEGORIES, useCart, type Product, type ShopCategory } from "@/lib/shop";
import { SITE_URL, useSeo } from "@/lib/seo";

type Sort = "popular" | "cheap" | "expensive";

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const category = (params.get("category") || "") as ShopCategory | "";
  const orderNumber = params.get("order");
  const [sort, setSort] = useState<Sort>("popular");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, clear } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["shop"], queryFn: fetchProducts });
  const all = useMemo(() => data?.items ?? [], [data]);

  const { data: order } = useQuery({ queryKey: ["shop-order", orderNumber], queryFn: () => fetchOrder(orderNumber!), enabled: !!orderNumber, retry: false });
  useEffect(() => {
    if (order?.status !== "paid") return;
    const k = `shop_cleared_${order.order_number}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.order_number]);

  const items = useMemo(() => {
    const list = all.filter((p) => !category || p.category === category);
    if (sort === "cheap") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "expensive") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [all, category, sort]);

  const counts = useMemo(() => all.reduce<Record<string, number>>((acc, p) => ((acc[p.category] = (acc[p.category] || 0) + 1), acc), {}), [all]);

  useSeo({
    title: category ? `${SHOP_CATEGORIES[category].label} — магазин addict.clinic` : "Магазин addict.clinic — мерч, подарочные сертификаты, литература",
    description: "Подарочные сертификаты на консультации психолога, книги и рабочие тетради для семей, мерч клиники. Анонимная упаковка, доставка по России.",
    path: category ? `/shop?category=${category}` : "/shop",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Магазин addict.clinic",
      url: `${SITE_URL}/shop`,
      itemListElement: all.map((p, i) => ({
        "@type": "ListItem", position: i + 1,
        item: { "@type": "Product", name: p.title, image: p.image_url, description: p.subtitle, offers: { "@type": "Offer", price: p.price, priceCurrency: "RUB", availability: "https://schema.org/InStock" } },
      })),
    },
  });

  const setCategory = (c: string) => setParams(c ? { category: c } : {});

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1280px] px-5 pb-20 pt-10 md:px-16 md:pt-16">
        <nav aria-label="Хлебные крошки" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link>
          <Icon name="ChevronRight" size={14} />
          <span className="text-foreground">Магазин</span>
        </nav>

        {order && (
          <div className={`mb-8 flex items-start gap-3 rounded-2xl p-4 ${order.status === "paid" ? "bg-live/10" : "bg-secondary"}`}>
            <Icon name={order.status === "paid" ? "CircleCheck" : order.status === "canceled" ? "CircleX" : "Clock"} size={20} className={order.status === "paid" ? "mt-0.5 text-live" : "mt-0.5"} />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {order.status === "paid" ? `Заказ ${order.order_number} оплачен — спасибо!` : order.status === "canceled" ? `Оплата заказа ${order.order_number} не прошла` : `Заказ ${order.order_number} ожидает оплаты`}
              </p>
              <p className="text-muted-foreground">
                {order.status === "paid" ? "Чек и электронные сертификаты придут на почту. Мы свяжемся по доставке товаров." : order.status === "canceled" ? "Товары остались в корзине — можно попробовать ещё раз." : "Если вы уже оплатили, статус обновится в течение минуты."}
              </p>
            </div>
            <button onClick={() => setParams(category ? { category } : {})} className="text-muted-foreground hover:text-foreground" aria-label="Скрыть"><Icon name="X" size={16} /></button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium">
              <Icon name="ShoppingBag" size={13} className="text-primary" />Магазин клиники
            </p>
            <h1 className="font-heading text-[2.4em] font-medium leading-[1.05] tracking-[-0.045em] md:text-[3.4em]">
              {category ? SHOP_CATEGORIES[category].label : <>Подарки, которые<br className="hidden md:block" /> поддерживают</>}
            </h1>
          </div>
          <p className="text-[1.05em] leading-relaxed text-muted-foreground">
            Сертификаты на помощь специалистов, книги для семей и вещи, которые напоминают: выздоровление возможно. Анонимная упаковка без упоминания клиники.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {(Object.keys(SHOP_CATEGORIES) as ShopCategory[]).map((k) => {
            const c = SHOP_CATEGORIES[k];
            const on = category === k;
            return (
              <button key={k} onClick={() => setCategory(on ? "" : k)}
                className={`group flex items-center gap-4 rounded-2xl p-4 text-left transition-all ${on ? "bg-ink text-ink-foreground" : "bg-card hover:-translate-y-0.5 hover:shadow-md"}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground"}`}>
                  <Icon name={c.icon} size={22} />
                </span>
                <span className="flex-1">
                  <span className="block font-heading font-semibold">{c.label}</span>
                  <span className={`block text-sm ${on ? "text-white/60" : "text-muted-foreground"}`}>{c.hint}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${on ? "bg-white/15" : "bg-secondary"}`}>{counts[k] || 0}</span>
              </button>
            );
          })}
        </div>

        <div className="sticky top-[56px] z-30 -mx-5 mt-6 flex items-center gap-2 bg-background/90 px-5 py-3 backdrop-blur md:mx-0 md:px-0">
          <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1">
            <button onClick={() => setCategory("")} className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${!category ? "bg-ink text-ink-foreground" : "bg-card hover:bg-secondary"}`}>
              Все <span className="opacity-60">{all.length}</span>
            </button>
            {(Object.keys(SHOP_CATEGORIES) as ShopCategory[]).map((k) => (
              <button key={k} onClick={() => setCategory(k)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${category === k ? "bg-ink text-ink-foreground" : "bg-card hover:bg-secondary"}`}>
                <Icon name={SHOP_CATEGORIES[k].icon} size={14} />{SHOP_CATEGORIES[k].label}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="hidden h-9 rounded-full border bg-card px-3 text-sm outline-none sm:block" aria-label="Сортировка">
            <option value="popular">Популярные</option>
            <option value="cheap">Сначала дешевле</option>
            <option value="expensive">Сначала дороже</option>
          </select>
          <button onClick={() => setCartOpen(true)} className="relative flex h-9 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" aria-label="Корзина">
            <Icon name="ShoppingBag" size={16} />
            <span className="hidden sm:inline">Корзина</span>
            {count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-primary">{count}</span>}
          </button>
        </div>

        {isLoading ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-card" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">В этой категории пока нет товаров</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className="group flex flex-col overflow-hidden rounded-2xl bg-card text-left transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.3)]">
                <div className="relative aspect-square overflow-hidden bg-secondary">
                  {p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  {p.badge && <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">{p.badge}</span>}
                  <span className="absolute right-3 top-3 flex h-7 items-center gap-1 rounded-full bg-background/85 px-2.5 text-[11px] font-medium backdrop-blur">
                    <Icon name={SHOP_CATEGORIES[p.category].icon} size={12} />{SHOP_CATEGORIES[p.category].label}
                  </span>
                  <span className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-ink text-ink-foreground opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <Icon name="Plus" size={18} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-heading font-semibold leading-snug">{p.title}</p>
                  {p.subtitle && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.subtitle}</p>}
                  <div className="mt-auto flex items-baseline gap-2 pt-3">
                    <span className="font-heading text-lg font-semibold">{p.slug === "cert-amount" ? `от ${rub(Number(p.options[0] || p.price))}` : rub(p.price)}</span>
                    {p.old_price && <span className="text-sm text-muted-foreground line-through">{rub(p.old_price)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-16 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "PackageCheck", t: "Анонимная упаковка", d: "Без логотипа и упоминания клиники" },
            { icon: "Truck", t: "Доставка по России", d: `Бесплатно от ${rub(data?.delivery.free_from ?? 5000)}` },
            { icon: "HeartHandshake", t: "Часть выручки — семьям", d: "Идёт на бесплатные консультации" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3 rounded-2xl border p-4">
              <Icon name={f.icon} size={22} className="shrink-0 text-primary" />
              <div><p className="font-medium">{f.t}</p><p className="text-sm text-muted-foreground">{f.d}</p></div>
            </div>
          ))}
        </div>
      </main>
      <Footer />

      {count > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-5 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 font-medium text-ink-foreground shadow-xl sm:hidden">
          <Icon name="ShoppingBag" size={18} />Корзина · {count}
        </button>
      )}

      <ProductDialog product={selected} onClose={() => setSelected(null)} onAdded={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} delivery={data?.delivery} />
    </div>
  );
};

export default Shop;
