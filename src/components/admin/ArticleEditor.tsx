import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import ArticleContent from "@/components/articles/ArticleContent";
import ArticleCta from "@/components/articles/ArticleCta";
import { ARTICLE_STATUS, CATEGORIES, CTA_TYPES, adminArticles, type Article } from "@/lib/articles";

const SNIPPETS: { label: string; icon: string; text: string }[] = [
  { label: "Заголовок", icon: "Heading2", text: "\n## Заголовок раздела\n" },
  { label: "Подзаголовок", icon: "Heading3", text: "\n### Подзаголовок\n" },
  { label: "Список", icon: "List", text: "\n- Первый пункт\n- Второй пункт\n" },
  { label: "Цифры", icon: "BarChart3", text: "\n:::stats\n70%|описание цифры\n24/7|описание цифры\n3 дня|описание цифры\n:::\n" },
  { label: "Чек-лист", icon: "ListChecks", text: "\n:::checklist\nПервый признак\nВторой признак\n:::\n" },
  { label: "Шаги", icon: "ListOrdered", text: "\n:::steps\nНазвание шага|Описание шага\nНазвание шага|Описание шага\n:::\n" },
  { label: "Таблица", icon: "Table", text: "\n| Колонка 1 | Колонка 2 |\n|---|---|\n| Значение | Значение |\n" },
  { label: "Важно", icon: "TriangleAlert", text: "\n:::callout warning\nТекст предупреждения\n:::\n" },
  { label: "Заметка", icon: "Info", text: "\n:::callout info\nТекст заметки\n:::\n" },
  { label: "Цитата", icon: "Quote", text: "\n> Текст цитаты\n" },
  { label: "Жирный", icon: "Bold", text: "**жирный текст**" },
  { label: "Ссылка", icon: "Link", text: "[текст ссылки](/premium)" },
];

const EMPTY: Partial<Article> = { title: "", slug: "", category: "alcohol", cta_type: "consult", status: "draft", content: "", author: "Врачи addict.clinic" };

const toBase64 = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

const Counter = ({ value, min, max }: { value: string; min: number; max: number }) => {
  const n = value.length;
  const ok = n >= min && n <= max;
  return <span className={`text-xs ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>{n} / {min}–{max}</span>;
};

const ArticleEditor = ({ id, onClose }: { id: number | null; onClose: () => void }) => {
  const [a, setA] = useState<Partial<Article>>(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [uploading, setUploading] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    adminArticles.get(id).then((r) => setA(r.item)).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [id]);

  const set = (k: keyof Article, v: unknown) => setA((p) => ({ ...p, [k]: v }));

  const insert = (text: string) => {
    const el = ta.current;
    const content = a.content || "";
    if (!el) { set("content", content + text); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    set("content", content.slice(0, s) + text + content.slice(e));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + text.length; });
  };

  const upload = async (f: File | undefined, target: "cover" | "inline") => {
    if (!f) return;
    setUploading(true);
    try {
      const { url } = await adminArticles.upload(await toBase64(f), f.type);
      if (target === "cover") set("cover_url", url);
      else insert(`\n![Описание изображения](${url})\n`);
      toast.success("Изображение загружено");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (status?: string) => {
    if (!a.title?.trim()) { toast.error("Укажите заголовок"); return; }
    setSaving(true);
    try {
      const body = { ...a, status: status || a.status };
      delete (body as any).id; delete (body as any).views; delete (body as any).created_at; delete (body as any).updated_at;
      const r = id || a.id ? await adminArticles.update((id || a.id)!, body) : await adminArticles.create(body);
      setA(r.item);
      toast.success(status === "published" ? "Статья опубликована" : "Сохранено");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-60 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;

  const metaTitle = a.meta_title || "";
  const metaDesc = a.meta_description || "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Icon name="ArrowLeft" size={16} />Все статьи</button>
        <div className="flex flex-wrap items-center gap-2">
          {a.status && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ARTICLE_STATUS[a.status]?.cls}`}>{ARTICLE_STATUS[a.status]?.label}</span>}
          {a.status === "published" && a.slug && (
            <a href={`/articles/${a.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-secondary"><Icon name="ExternalLink" size={14} />На сайте</a>
          )}
          <Button variant="outline" size="sm" disabled={saving} onClick={() => save()}>Сохранить</Button>
          {a.status !== "published" ? (
            <Button size="sm" disabled={saving} onClick={() => save("published")}><Icon name="Send" size={14} className="mr-1.5" />Опубликовать</Button>
          ) : (
            <Button size="sm" variant="outline" disabled={saving} onClick={() => save("draft")}>Снять с публикации</Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Input value={a.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Заголовок статьи (H1)" className="h-14 bg-card font-heading text-xl font-semibold" />
          <Textarea value={a.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} rows={2} placeholder="Короткий анонс — показывается в карточке и под заголовком" className="bg-card" />

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-2">
              <div className="flex">
                {(["edit", "preview"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm ${tab === t ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>
                    {t === "edit" ? "Текст" : "Предпросмотр"}
                  </button>
                ))}
              </div>
              <span className="pr-2 text-xs text-muted-foreground">{(a.content || "").split(/\s+/).filter(Boolean).length} слов</span>
            </div>
            {tab === "edit" ? (
              <>
                <div className="flex flex-wrap gap-1 border-b bg-secondary/40 p-2">
                  {SNIPPETS.map((s) => (
                    <button key={s.label} onClick={() => insert(s.text)} title={s.label} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-card">
                      <Icon name={s.icon} size={14} /><span className="hidden sm:inline">{s.label}</span>
                    </button>
                  ))}
                  <button onClick={() => imgRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-card">
                    <Icon name={uploading ? "Loader2" : "ImagePlus"} size={14} className={uploading ? "animate-spin" : ""} /><span className="hidden sm:inline">Картинка</span>
                  </button>
                  <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0], "inline"); e.target.value = ""; }} />
                </div>
                <textarea ref={ta} value={a.content || ""} onChange={(e) => set("content", e.target.value)} rows={28}
                  className="w-full resize-y bg-card p-4 font-mono text-[13px] leading-relaxed outline-none" placeholder="Текст статьи. Используйте кнопки выше, чтобы вставить заголовки, списки, цифры, шаги и другие графические блоки." />
              </>
            ) : (
              <div className="bg-background p-6">
                <ArticleContent content={a.content || ""} />
                <ArticleCta type={a.cta_type || "consult"} source="preview" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Обложка">
            {a.cover_url ? (
              <div className="relative overflow-hidden rounded-lg">
                <img src={a.cover_url} alt="" className="aspect-[16/10] w-full object-cover" />
                <button onClick={() => set("cover_url", null)} className="absolute right-2 top-2 rounded-full bg-card p-1.5 shadow"><Icon name="X" size={14} /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:bg-secondary/50">
                <Icon name={uploading ? "Loader2" : "ImagePlus"} size={24} className={uploading ? "animate-spin" : ""} />Загрузить обложку
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0], "cover"); e.target.value = ""; }} />
            <Input value={a.cover_alt || ""} onChange={(e) => set("cover_alt", e.target.value)} placeholder="Описание картинки (alt) для SEO" className="mt-2" />
          </Panel>

          <Panel title="Публикация">
            <Field label="Направление">
              <Select value={a.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Призыв к действию">
              <Select value={a.cta_type} onValueChange={(v) => set("cta_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CTA_TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Автор / эксперт">
              <Input value={a.author || ""} onChange={(e) => set("author", e.target.value)} />
            </Field>
            <Field label="Дата публикации">
              <Input type="date" value={a.published_at ? a.published_at.slice(0, 10) : ""} onChange={(e) => set("published_at", e.target.value || null)} />
            </Field>
          </Panel>

          <Panel title="SEO">
            <Field label="Адрес страницы" extra={<span className="text-xs text-muted-foreground">/articles/…</span>}>
              <Input value={a.slug || ""} onChange={(e) => set("slug", e.target.value)} placeholder="создастся из заголовка" />
            </Field>
            <Field label="Title" extra={<Counter value={metaTitle} min={40} max={70} />}>
              <Textarea rows={2} value={metaTitle} onChange={(e) => set("meta_title", e.target.value)} placeholder="Если пусто — возьмём заголовок" />
            </Field>
            <Field label="Description" extra={<Counter value={metaDesc} min={120} max={160} />}>
              <Textarea rows={3} value={metaDesc} onChange={(e) => set("meta_description", e.target.value)} placeholder="Если пусто — возьмём анонс" />
            </Field>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">Так статья выглядит в поиске</p>
              <p className="mt-1 truncate text-sm text-[#1a0dab]">{metaTitle || a.title || "Заголовок статьи"}</p>
              <p className="truncate text-xs text-emerald-700">addict.clinic › articles › {a.slug || "adres"}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{metaDesc || a.excerpt || "Описание статьи"}</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="mb-3 font-heading text-sm font-semibold">{title}</p>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const Field = ({ label, extra, children }: { label: string; extra?: React.ReactNode; children: React.ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1.5 flex items-center justify-between font-medium">{label}{extra}</span>
    {children}
  </label>
);

export default ArticleEditor;
