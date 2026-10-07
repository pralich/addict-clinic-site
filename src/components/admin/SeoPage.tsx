import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { SITEMAP_LIVE_URL, SITEMAP_PUBLIC_URL, seoApi, type RegenerateResult } from "@/lib/seo-api";
import { fmtDate } from "./config";
import SeoCounters from "./SeoCounters";

const short = (u: string) => u.replace("https://addict.clinic", "") || "/";

const SeoPage = () => {
  const qc = useQueryClient();
  const [result, setResult] = useState<RegenerateResult | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["crm", "seo"], queryFn: seoApi.status });

  const regen = useMutation({
    mutationFn: seoApi.regenerate,
    onSuccess: (r) => {
      setResult(r);
      toast.success(`Карта сайта обновлена: ${r.urls_count} страниц`);
      qc.invalidateQueries({ queryKey: ["crm", "seo"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([result.xml], { type: "application/xml" }));
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading || !data) {
    return <div className="flex h-60 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  }

  const pending = data.pending_add.length + data.pending_remove.length;
  const articles = data.urls.filter((u) => u.title);
  const list = showAll ? data.urls : data.urls.slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">SEO</h1>
        <p className="text-sm text-muted-foreground">Карта сайта, счётчики и подтверждение сайта в поисковиках</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon name="Map" size={19} /></span>
              <div>
                <p className="font-heading font-semibold">Карта сайта (sitemap.xml)</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {data.last ? <>Обновлена {fmtDate(data.last.created_at, true)}{data.last.author ? ` · ${data.last.author}` : ""}</> : "Ещё не обновлялась из админки"}
                </p>
              </div>
            </div>
            {pending > 0 ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Есть изменения: {pending}</span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Актуальна</span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["Всего страниц", data.urls.length],
              ["Статей", articles.length],
              ["Разделов", data.urls.length - articles.length],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-secondary/60 px-3 py-2.5">
                <p className="font-heading text-2xl font-semibold tabular-nums">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>

          {pending > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              {data.pending_add.length > 0 && <p className="text-amber-900">Будут добавлены: {data.pending_add.map(short).join(", ")}</p>}
              {data.pending_remove.length > 0 && <p className="mt-1 text-amber-900">Будут удалены: {data.pending_remove.map(short).join(", ")}</p>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="rounded-full" onClick={() => regen.mutate()} disabled={regen.isPending}>
              <Icon name={regen.isPending ? "Loader2" : "RefreshCw"} size={15} className={`mr-1.5 ${regen.isPending ? "animate-spin" : ""}`} />
              Обновить карту сайта
            </Button>
            <a href={SITEMAP_LIVE_URL} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary">
              <Icon name="FileCode" size={14} />Открыть XML
            </a>
            {result && (
              <button onClick={download} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary">
                <Icon name="Download" size={14} />Скачать файл
              </button>
            )}
          </div>

          {result && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-medium">Готово: {result.urls_count} страниц, из них {result.articles_count} статей.</p>
              {result.added.length > 0 && <p className="mt-1">Добавлены: {result.added.map(short).join(", ")}</p>}
              {result.removed.length > 0 && <p className="mt-1">Удалены: {result.removed.map(short).join(", ")}</p>}
              {!result.added.length && !result.removed.length && <p className="mt-1">Состав страниц не изменился, обновлены даты.</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 text-sm">
          <p className="font-heading font-semibold">Как это работает</p>
          <ul className="mt-3 space-y-2.5 text-muted-foreground">
            <li className="flex gap-2"><Icon name="Check" size={15} className="mt-0.5 shrink-0 text-primary" />В карту попадают все разделы сайта и опубликованные статьи. Черновики, архив, админка и кабинет близких — нет.</li>
            <li className="flex gap-2"><Icon name="Check" size={15} className="mt-0.5 shrink-0 text-primary" />Нажимайте «Обновить» после публикации или удаления статей.</li>
            <li className="flex gap-2"><Icon name="Check" size={15} className="mt-0.5 shrink-0 text-primary" />Свежая карта подставляется на сайт при следующей публикации.</li>
            <li className="flex gap-2"><Icon name="Check" size={15} className="mt-0.5 shrink-0 text-primary" />Адрес для Яндекс Вебмастера и Google Search Console:</li>
          </ul>
          <button
            onClick={() => { navigator.clipboard.writeText(SITEMAP_PUBLIC_URL); toast.success("Адрес скопирован"); }}
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-left font-mono text-xs hover:bg-secondary/70"
          >
            {SITEMAP_PUBLIC_URL}
            <Icon name="Copy" size={14} className="shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      <SeoCounters />

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="font-heading font-semibold">Страницы в карте</p>
          <span className="text-xs text-muted-foreground">{data.urls.length}</span>
        </div>
        <div className="divide-y">
          {list.map((u) => (
            <div key={u.loc} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <Icon name={u.title ? "FileText" : "Globe"} size={15} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a href={u.loc.replace("https://addict.clinic", "")} target="_blank" rel="noreferrer" className="block truncate hover:text-primary">{u.title || short(u.loc)}</a>
                {u.title && <p className="truncate text-xs text-muted-foreground">{short(u.loc)}</p>}
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{u.lastmod.split("-").reverse().join(".")}</span>
              <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs tabular-nums">{u.priority}</span>
            </div>
          ))}
        </div>
        {data.urls.length > 12 && (
          <button onClick={() => setShowAll(!showAll)} className="w-full border-t py-2.5 text-sm font-medium text-primary hover:bg-secondary/50">
            {showAll ? "Свернуть" : `Показать все (${data.urls.length})`}
          </button>
        )}
      </div>

      {data.history.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <p className="border-b px-5 py-3 font-heading font-semibold">История обновлений</p>
          <div className="divide-y">
            {data.history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span>{fmtDate(h.created_at, true)}</span>
                <span className="text-muted-foreground">{h.urls_count} страниц · {h.articles_count} статей{h.author ? ` · ${h.author}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeoPage;
