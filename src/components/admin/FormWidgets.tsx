import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtDate } from "./config";
import { PROJECTS, ProjectIcon } from "./ProjectBadge";

const SCRIPT_URL = "https://addict.clinic/fw.js";

type Widget = { id: number; token: string; name: string; project: string; domains: string | null; is_active: boolean; leads_count: number; last_lead_at: string | null; created_at: string; author: string | null };

const snippet = (token: string) => `<script src="${SCRIPT_URL}" data-token="${token}" async></script>`;

const copy = (text: string, msg = "Скопировано") => {
  navigator.clipboard.writeText(text);
  toast.success(msg);
};

const ProjectPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex shrink-0 gap-1 rounded-lg bg-secondary p-1">
    {Object.entries(PROJECTS).map(([k, l]) => (
      <button key={k} type="button" onClick={() => onChange(k)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${value === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
        <ProjectIcon project={k} size={16} />{l}
      </button>
    ))}
  </div>
);

const WidgetRow = ({ w }: { w: Widget }) => {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: w.name, project: w.project, domains: w.domains || "" });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api({ resource: "form_widgets", id: w.id }, "PUT", body),
    onSuccess: () => { setEdit(false); qc.invalidateQueries({ queryKey: ["crm", "form_widgets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={`flex flex-col gap-3 px-4 py-4 text-sm ${w.is_active ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <ProjectIcon project={w.project} size={22} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{w.name}</p>
          <p className="text-xs text-muted-foreground">
            {w.domains ? `Сайты: ${w.domains}` : "Любой сайт"} · создан {fmtDate(w.created_at)}{w.author ? `, ${w.author}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{w.leads_count} лидов</p>
          <p>{w.last_lead_at ? `последний ${fmtDate(w.last_lead_at, true)}` : "заявок пока нет"}</p>
        </div>
        <Switch checked={w.is_active} onCheckedChange={(c) => save.mutate({ is_active: c })} aria-label="Включён" />
        <Button variant="ghost" size="sm" onClick={() => setEdit(!edit)}><Icon name="Pencil" size={14} /></Button>
      </div>

      {edit && (
        <form className="flex flex-col gap-2 rounded-lg border p-3" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название" />
          <Input value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="Разрешённые сайты через запятую, пусто — любой" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ProjectPicker value={form.project} onChange={(project) => setForm({ ...form, project })} />
            <Button type="submit" size="sm" className="rounded-full" disabled={save.isPending}>Сохранить</Button>
          </div>
        </form>
      )}

      <button onClick={() => copy(snippet(w.token), "Код виджета скопирован")} className="flex w-full items-center justify-between gap-2 rounded-lg bg-night px-3 py-2.5 text-left font-mono text-[11px] text-night-foreground hover:opacity-90 md:text-xs">
        <span className="break-all">{snippet(w.token)}</span>
        <Icon name="Copy" size={14} className="shrink-0" />
      </button>
    </div>
  );
};

const FormWidgets = () => {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [domains, setDomains] = useState("");
  const [project, setProject] = useState("addict");
  const { data } = useQuery<{ items: Widget[] }>({ queryKey: ["crm", "form_widgets"], queryFn: () => api({ resource: "form_widgets" }) });
  const create = useMutation({
    mutationFn: () => api({ resource: "form_widgets" }, "POST", { name, domains, project }),
    onSuccess: () => { toast.success("Виджет создан — скопируйте код ниже"); setName(""); setDomains(""); qc.invalidateQueries({ queryKey: ["crm", "form_widgets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const items = data?.items ?? [];

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon name="ScanLine" size={19} /></span>
        <div>
          <p className="font-heading font-semibold">Виджет-перехватчик форм</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Вставьте код на любой сайт перед закрывающим тегом &lt;/body&gt;. Виджет сам находит формы, копирует заявку в CRM как лид и запоминает, откуда пришёл посетитель: реклама, поиск, соцсети, метки UTM. Работа самой формы на сайте не меняется.
          </p>
        </div>
      </div>

      <form className="mt-4 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название, например «РЕБА.РФ — лендинг»" className="flex-1" />
          <Input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="Сайт, например реба.рф" className="sm:w-56" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ProjectPicker value={project} onChange={setProject} />
          <Button type="submit" className="rounded-full" disabled={!name.trim() || create.isPending}>
            <Icon name="Plus" size={15} className="mr-1.5" />Создать виджет
          </Button>
        </div>
      </form>

      <div className="mt-4 divide-y rounded-lg border">
        {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Виджетов пока нет</p>}
        {items.map((w) => <WidgetRow key={w.id} w={w} />)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Если указать сайт, виджет примет заявки только с него и его поддоменов — так код не смогут использовать на чужих сайтах. Заявки без телефона и почты не создаются, повторная отправка той же формы в течение 3 минут не создаёт дубль.
      </p>
    </div>
  );
};

export default FormWidgets;
