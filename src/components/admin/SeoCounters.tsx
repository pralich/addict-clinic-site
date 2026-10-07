import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/ui/icon";
import { seoApi, type CounterKind } from "@/lib/seo-api";
import { useAuth } from "./AuthContext";
import { fmtDate } from "./config";

type Def = { kind: CounterKind; title: string; hint: string; placeholder: string; icon: string; group: "analytics" | "verify"; link: string };

const DEFS: Def[] = [
  { kind: "yandex_metrika", title: "Яндекс Метрика", hint: "Номер счётчика", placeholder: "101026698", icon: "BarChart3", group: "analytics", link: "https://metrika.yandex.ru/list" },
  { kind: "google_analytics", title: "Google Analytics 4", hint: "Идентификатор потока", placeholder: "G-XXXXXXXXXX", icon: "LineChart", group: "analytics", link: "https://analytics.google.com/" },
  { kind: "vk_pixel", title: "Пиксель VK Рекламы", hint: "Код пикселя", placeholder: "VK-RTRG-123456-AbCdE", icon: "Target", group: "analytics", link: "https://ads.vk.com/" },
  { kind: "top_mail_ru", title: "Top.Mail.Ru", hint: "Номер счётчика", placeholder: "3456789", icon: "Activity", group: "analytics", link: "https://top.mail.ru/" },
  { kind: "yandex_verification", title: "Яндекс Вебмастер", hint: "Код из мета-тега yandex-verification", placeholder: "a1b2c3d4e5f6g7h8", icon: "BadgeCheck", group: "verify", link: "https://webmaster.yandex.ru/" },
  { kind: "google_verification", title: "Google Search Console", hint: "Код из мета-тега google-site-verification", placeholder: "AbCdEf123...", icon: "BadgeCheck", group: "verify", link: "https://search.google.com/search-console" },
];

type Form = Record<CounterKind, { value: string; enabled: boolean }>;

const SeoCounters = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["crm", "seo-counters"], queryFn: seoApi.counters });
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<CounterKind, string>>>({});

  useEffect(() => {
    if (!data) return;
    setForm(Object.fromEntries(DEFS.map((d) => [d.kind, { value: data.counters[d.kind]?.value || "", enabled: data.counters[d.kind]?.enabled ?? true }])) as Form);
  }, [data]);

  const save = useMutation({
    mutationFn: () => seoApi.saveCounters(form!),
    onSuccess: () => {
      setErrors({});
      toast.success("Счётчики сохранены. На сайте они появятся в течение 5 минут");
      qc.invalidateQueries({ queryKey: ["crm", "seo-counters"] });
    },
    onError: (e: Error & { details?: Partial<Record<CounterKind, string>> }) => {
      setErrors(e.details || {});
      toast.error(e.message);
    },
  });

  if (!form) return null;

  const set = (k: CounterKind, patch: Partial<{ value: string; enabled: boolean }>) => {
    setForm({ ...form, [k]: { ...form[k], ...patch } });
    setErrors({ ...errors, [k]: undefined });
  };
  const dirty = DEFS.some((d) => form[d.kind].value !== (data?.counters[d.kind]?.value || "") || form[d.kind].enabled !== (data?.counters[d.kind]?.enabled ?? true));
  const active = DEFS.filter((d) => d.group === "analytics" && form[d.kind].value && form[d.kind].enabled).length;

  const card = (d: Def) => {
    const row = data?.counters[d.kind];
    const f = form[d.kind];
    const on = !!f.value && f.enabled;
    return (
      <div key={d.kind} className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <Icon name={d.icon} size={17} />
            </span>
            <div>
              <p className="font-medium leading-tight">{d.title}</p>
              <a href={d.link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary">Где взять код →</a>
            </div>
          </div>
          <Switch checked={f.enabled} onCheckedChange={(v) => set(d.kind, { enabled: v })} disabled={!canEdit || !f.value} />
        </div>
        <label className="mt-3 block text-xs text-muted-foreground">{d.hint}</label>
        <Input
          value={f.value}
          onChange={(e) => set(d.kind, { value: e.target.value })}
          placeholder={d.placeholder}
          disabled={!canEdit}
          className={`mt-1 font-mono text-sm ${errors[d.kind] ? "border-destructive" : ""}`}
        />
        {errors[d.kind] ? (
          <p className="mt-1.5 text-xs text-destructive">{errors[d.kind]}</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {on ? "Подключён" : f.value ? "Выключен" : "Не подключён"}
            {row?.updated_at && row.value ? ` · изменён ${fmtDate(row.updated_at)}${row.author ? `, ${row.author}` : ""}` : ""}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon name="Gauge" size={19} /></span>
          <div>
            <p className="font-heading font-semibold">Счётчики и аналитика</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Активно счётчиков: {active}. Вставьте код — он заработает на всех страницах сайта без правки кода.</p>
          </div>
        </div>
        {canEdit && (
          <Button className="rounded-full" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            <Icon name={save.isPending ? "Loader2" : "Save"} size={15} className={`mr-1.5 ${save.isPending ? "animate-spin" : ""}`} />
            Сохранить
          </Button>
        )}
      </div>

      {!canEdit && <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">Менять счётчики может только администратор.</p>}

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Аналитика и реклама</p>
      <div className="grid gap-3 md:grid-cols-2">{DEFS.filter((d) => d.group === "analytics").map(card)}</div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Подтверждение прав на сайт</p>
      <div className="grid gap-3 md:grid-cols-2">{DEFS.filter((d) => d.group === "verify").map(card)}</div>

      <div className="mt-5 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <Icon name="ShieldCheck" size={16} className="mt-0.5 shrink-0" />
        <p>Счётчики аналитики и рекламы включаются только у посетителей, которые дали согласие на аналитические cookie, — как требует закон. В админке и CRM они не работают. Можно вставлять как сам код, так и весь мета-тег целиком — лишнее уберётся автоматически.</p>
      </div>
    </div>
  );
};

export default SeoCounters;
