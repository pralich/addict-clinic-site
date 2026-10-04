import { useCallback, useEffect, useState } from "react";
import func2url from "../../backend/func2url.json";

const URL_ = (func2url as Record<string, string>)["shop"];

export type ShopCategory = "merch" | "certificates" | "books";

export type Product = {
  id: number;
  slug: string;
  category: ShopCategory;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  badge: string | null;
  options: string[];
  is_digital: boolean;
  in_stock: boolean;
};

export type CartLine = { key: string; id: number; title: string; image: string | null; option: string; raw: string; price: number; qty: number; digital: boolean };

export const SHOP_CATEGORIES: Record<ShopCategory, { label: string; icon: string; hint: string }> = {
  merch: { label: "Мерч", icon: "Shirt", hint: "Одежда и аксессуары" },
  certificates: { label: "Сертификаты", icon: "Gift", hint: "Подарок заботы" },
  books: { label: "Литература", icon: "BookOpen", hint: "Книги и рабочие тетради" },
};

export const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export const productPrice = (p: Product, option: string) => (p.slug === "cert-amount" && /^\d+$/.test(option) ? Number(option) : p.price);
export const optionLabel = (p: Product, o: string) => (p.slug === "cert-amount" ? rub(Number(o)) : o);

export const fetchProducts = async (): Promise<{ items: Product[]; delivery: { price: number; free_from: number } }> => {
  const r = await fetch(URL_);
  if (!r.ok) throw new Error("Не удалось загрузить каталог");
  return r.json();
};

export const checkout = async (body: unknown): Promise<{ payment_url: string; order_number: string }> => {
  const r = await fetch(`${URL_}?action=checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Не удалось оформить заказ");
  return data;
};

export const fetchOrder = async (number: string) => {
  const r = await fetch(`${URL_}?action=order&number=${encodeURIComponent(number)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Заказ не найден");
  return data.order as { order_number: string; status: string; amount: number };
};

const KEY = "shop_cart_v1";
const read = (): CartLine[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const useCart = () => {
  const [lines, setLines] = useState<CartLine[]>(read);

  useEffect(() => {
    const sync = () => setLines(read());
    window.addEventListener("shop-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shop-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: CartLine[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("shop-cart"));
  }, []);

  const add = (p: Product, option: string, qty = 1) => {
    const key = `${p.id}:${option}`;
    const cur = read();
    const found = cur.find((l) => l.key === key);
    if (found) found.qty = Math.min(20, found.qty + qty);
    else cur.push({ key, id: p.id, title: p.title, image: p.image_url, option: option ? optionLabel(p, option) : "", raw: option, price: productPrice(p, option), qty, digital: p.is_digital });
    save(cur);
  };
  const setQty = (key: string, qty: number) => save(read().map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)));
  const remove = (key: string) => save(read().filter((l) => l.key !== key));
  const clear = () => save([]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return { lines, add, setQty, remove, clear, count, subtotal };
};
