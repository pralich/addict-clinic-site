import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtDate } from "./config";
import { useCrmMutation } from "./useCrm";
import { useAuth } from "./AuthContext";

type TrashItem = { id: number; title: string | null; subtitle: string | null; trashed_at: string; trashed_by_name: string | null; days_left: number };

const plural = (n: number, forms: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100;
  return forms[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 1 : 2];
};

const TrashDialog = ({ resource, open, onOpenChange }: { resource: string; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [sel, setSel] = useState<number[]>([]);
  const mut = useCrmMutation();
  const { data, isLoading } = useQuery<{ items: TrashItem[]; days: number }>({
    queryKey: ["crm", "trash", resource],
    queryFn: () => api({ resource, action: "trashed" }),
    enabled: open,
  });
  const items = data?.items ?? [];
  const allChecked = items.length > 0 && sel.length === items.length;

  const run = (action: "untrash" | "destroy") => {
    if (!sel.length) return;
    if (action === "destroy" && !confirm(`Удалить навсегда ${sel.length} ${plural(sel.length, ["запись", "записи", "записей"])}? Восстановить будет нельзя.`)) return;
    mut.mutate(
      { params: { resource, action }, method: "POST", body: { ids: sel } },
      { onSuccess: (r: any) => { toast.success(action === "untrash" ? `Восстановлено: ${r.count}` : `Удалено навсегда: ${r.count}`); setSel([]); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSel([]); }}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon name="Trash2" size={18} />Корзина · {resource === "leads" ? "лиды" : "клиенты"}</DialogTitle>
          <p className="text-sm text-muted-foreground">Записи хранятся {data?.days ?? 30} дней, затем удаляются автоматически.</p>
        </DialogHeader>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={allChecked} onCheckedChange={(c) => setSel(c ? items.map((i) => i.id) : [])} />
              {sel.length ? `Выбрано: ${sel.length}` : "Выбрать все"}
            </label>
            <Button size="sm" variant="outline" disabled={!sel.length || mut.isPending} onClick={() => run("untrash")}>
              <Icon name="RotateCcw" size={14} className="mr-1.5" />Восстановить
            </Button>
            {isAdmin && (
              <Button size="sm" variant="destructive" disabled={!sel.length || mut.isPending} onClick={() => run("destroy")}>
                <Icon name="Trash2" size={14} className="mr-1.5" />Удалить навсегда
              </Button>
            )}
          </div>
        )}

        <div className="-mx-6 flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Icon name="Trash" size={28} className="mx-auto mb-2 opacity-40" />Корзина пуста
            </div>
          ) : (
            <div className="divide-y">
              {items.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-center gap-3 py-2.5">
                  <Checkbox checked={sel.includes(i.id)} onCheckedChange={(c) => setSel((s) => (c ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.title || "Аноним"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[i.subtitle, `удалено ${fmtDate(i.trashed_at, true)}`, i.trashed_by_name].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${i.days_left <= 3 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                    {i.days_left} {plural(i.days_left, ["день", "дня", "дней"])}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrashDialog;
