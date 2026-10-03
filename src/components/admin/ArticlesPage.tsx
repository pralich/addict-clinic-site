import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import ArticleEditor from "./ArticleEditor";
import { ARTICLE_STATUS, CATEGORIES, adminArticles } from "@/lib/articles";
import { fmtDate } from "./config";

const ArticlesPage = () => {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["crm", "articles", search, status], queryFn: () => adminArticles.list(search, status), enabled: editing === null });

  if (editing !== null) {
    return <ArticleEditor key={String(editing)} id={editing === "new" ? null : editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["crm", "articles"] }); qc.invalidateQueries({ queryKey: ["articles"] }); }} />;
  }

  const items = data?.items ?? [];
  const archive = async (id: number) => {
    await adminArticles.archive(id).catch((e) => toast.error(e.message));
    qc.invalidateQueries({ queryKey: ["crm", "articles"] });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Статьи</h1>
          <p className="text-sm text-muted-foreground">{items.length} материалов · раздел «Статьи» на сайте</p>
        </div>
        <div className="flex gap-2">
          <a href="/articles" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary"><Icon name="ExternalLink" size={14} />Открыть раздел</a>
          <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}><Icon name="Plus" size={14} className="mr-1.5" />Новая статья</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по заголовку" className="bg-card pl-9" />
        </div>
        {[["", "Все"], ...Object.entries(ARTICLE_STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-4 text-sm ${status === k ? "bg-ink text-ink-foreground" : "border bg-card"}`}>{l}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Статья</TableHead>
                <TableHead>Направление</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-center">Просмотры</TableHead>
                <TableHead>Опубликована</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setEditing(a.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {a.cover_url ? <img src={a.cover_url} alt="" className="h-10 w-14 shrink-0 rounded object-cover" /> : <div className="h-10 w-14 shrink-0 rounded bg-secondary" />}
                      <span className="line-clamp-2 font-medium">{a.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{CATEGORIES[a.category]?.label || a.category}</TableCell>
                  <TableCell><span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${ARTICLE_STATUS[a.status]?.cls}`}>{ARTICLE_STATUS[a.status]?.label}</span></TableCell>
                  <TableCell className="text-center">{a.views}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(a.published_at)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {a.status !== "archived" && (
                      <Button variant="ghost" size="sm" title="В архив" onClick={() => archive(a.id)}><Icon name="Archive" size={14} /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Статей нет</TableCell></TableRow>
              )}
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Загрузка…</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ArticlesPage;
