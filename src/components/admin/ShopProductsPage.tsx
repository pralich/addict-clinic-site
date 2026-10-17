import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { SHOP_CATEGORIES, rub, type ShopCategory } from "@/lib/shop";
import { useCrmMutation } from "./useCrm";

type AdminProduct = {
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
  options: string | null;
  is_digital: boolean;
  in_stock: boolean;
  is_active: boolean;
  sort: number;
  sold: number;
};

const EMPTY: Partial<AdminProduct> = { category: "merch", title: "", price: 0, sort: 100, is_digital: false, in_stock: true, is_active: true };

const toBase64 = (f: File) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

const ShopProductsPage = () => {
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const [editing, setEditing] = useState<Partial<AdminProduct> | null>(null);
  const mut = useCrmMutation();
  const { data, isLoading } = useQuery<{ items: AdminProduct[] }>({
    queryKey: ["crm", "shop_products"],
    queryFn: () => api({ resource: "shop_products" }),
  });
  const items = (data?.items ?? []).filter((p) => cat === "all" || p.category === cat);

  const toggle = (p: AdminProduct, field: "in_stock" | "is_active", value: boolean) =>
    mut.mutate({ params: { resource: "shop_products", id: p.id }, method: "PUT", body: { [field]: value } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Товары магазина</h1>
          <p className="text-sm text-muted-foreground">Цены, фото, наличие и порядок на витрине</p>
        </div>
        <Button size="sm" className="rounded-full" onClick={() => setEditing({ ...EMPTY, category: cat === "all" ? "merch" : cat })}>
          <Icon name="Plus" size={14} className="mr-1.5" />Добавить товар
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([["all", "Все"], ...Object.entries(SHOP_CATEGORIES).map(([k, v]) => [k, v.label])] as [string, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setCat(k as ShopCategory | "all")}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${cat === k ? "bg-ink text-ink-foreground" : "bg-card hover:bg-secondary"}`}>{l}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Товаров пока нет</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className={`flex flex-col overflow-hidden rounded-xl border bg-card ${p.is_active ? "" : "opacity-60"}`}>
              <button onClick={() => setEditing(p)} className="flex gap-3 p-3 text-left hover:bg-secondary/40">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Icon name="ImageOff" size={20} /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{SHOP_CATEGORIES[p.category]?.label || p.category}</p>
                  <p className="line-clamp-2 font-medium leading-snug">{p.title}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading font-semibold">{rub(p.price)}</span>
                    {p.old_price ? <span className="text-xs text-muted-foreground line-through">{rub(p.old_price)}</span> : null}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.badge && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">{p.badge}</span>}
                    {p.is_digital && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">Электронный</span>}
                    {Number(p.sold) > 0 && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">Продано: {p.sold}</span>}
                  </div>
                </div>
                <Icon name="Pencil" size={15} className="shrink-0 text-muted-foreground" />
              </button>
              <div className="mt-auto flex items-center gap-4 border-t px-3 py-2 text-xs">
                <label className="flex items-center gap-2"><Switch checked={p.in_stock} onCheckedChange={(v) => toggle(p, "in_stock", v)} />В наличии</label>
                <label className="flex items-center gap-2"><Switch checked={p.is_active} onCheckedChange={(v) => toggle(p, "is_active", v)} />На витрине</label>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductDialog product={editing} onClose={() => setEditing(null)} />
    </div>
  );
};

const L = ({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) => (
  <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}><span className="mb-1.5 block font-medium">{label}</span>{children}</label>
);

const ProductDialog = ({ product, onClose }: { product: Partial<AdminProduct> | null; onClose: () => void }) => {
  const [d, setD] = useState<Partial<AdminProduct>>({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mut = useCrmMutation();
  const isNew = !product?.id;

  useEffect(() => { if (product) setD(product); }, [product]);
  const set = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K] | null) => setD((p) => ({ ...p, [k]: v }));

  const upload = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const { url } = await api<{ url: string }>({ resource: "shop_products", action: "upload" }, "POST", { file: await toBase64(f), contentType: f.type });
      set("image_url", url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = {
      category: d.category, title: d.title, subtitle: d.subtitle, description: d.description, price: d.price,
      old_price: d.old_price || null, image_url: d.image_url, badge: d.badge, options: d.options, sort: d.sort,
      is_digital: !!d.is_digital, in_stock: !!d.in_stock, is_active: !!d.is_active,
    };
    mut.mutate(
      isNew ? { params: { resource: "shop_products" }, method: "POST", body } : { params: { resource: "shop_products", id: product!.id }, method: "PUT", body },
      { onSuccess: () => { toast.success(isNew ? "Товар добавлен" : "Сохранено"); onClose(); } },
    );
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{isNew ? "Новый товар" : "Редактировать товар"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-secondary">
              {d.image_url ? <img src={d.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Icon name="Image" size={24} /></div>}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Icon name={uploading ? "Loader2" : "ImagePlus"} size={14} className={`mr-1.5 ${uploading ? "animate-spin" : ""}`} />{d.image_url ? "Заменить фото" : "Загрузить фото"}
              </Button>
              {d.image_url && <Button type="button" variant="ghost" size="sm" onClick={() => set("image_url", null)}>Убрать фото</Button>}
              <p className="text-xs text-muted-foreground">JPG, PNG или WEBP до 8 МБ, лучше квадратное</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </div>

          <L label="Название *" full><Input required value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></L>
          <L label="Категория *">
            <Select value={d.category} onValueChange={(v) => set("category", v as ShopCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SHOP_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </L>
          <L label="Метка на карточке"><Input value={d.badge ?? ""} placeholder="Например, Новинка" onChange={(e) => set("badge", e.target.value)} /></L>
          <L label="Цена, ₽ *"><Input required type="number" min="0" value={d.price ?? ""} onChange={(e) => set("price", e.target.value as unknown as number)} /></L>
          <L label="Старая цена, ₽"><Input type="number" min="0" value={d.old_price ?? ""} placeholder="Для зачёркнутой цены" onChange={(e) => set("old_price", e.target.value as unknown as number)} /></L>
          <L label="Короткое описание" full><Input value={d.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} /></L>
          <L label="Подробное описание" full><Textarea rows={5} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></L>
          <L label="Варианты (через запятую)" full>
            <Input value={d.options ?? ""} placeholder="Например: S, M, L, XL" onChange={(e) => set("options", e.target.value)} />
            {product?.slug === "cert-amount" && <span className="mt-1 block text-xs text-muted-foreground">Для этого сертификата варианты — это номиналы в рублях.</span>}
          </L>
          <L label="Порядок на витрине"><Input type="number" min="0" value={d.sort ?? ""} placeholder="Меньше — выше" onChange={(e) => set("sort", e.target.value as unknown as number)} /></L>
          <div className="flex flex-col gap-2.5 pt-1 text-sm">
            <label className="flex items-center gap-2"><Switch checked={!!d.in_stock} onCheckedChange={(v) => set("in_stock", v)} />В наличии</label>
            <label className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={(v) => set("is_active", v)} />Показывать на витрине</label>
            <label className="flex items-center gap-2"><Switch checked={!!d.is_digital} onCheckedChange={(v) => set("is_digital", v)} />Электронный (без доставки)</label>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={mut.isPending || uploading}>{mut.isPending ? "Сохраняем…" : "Сохранить"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShopProductsPage;
