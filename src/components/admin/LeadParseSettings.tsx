import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";

const MAP: [string, string][] = [
  ["Кому нужна помощь", "для себя, близкому, сыну или дочери, мужу или жене, родителю, подростку, после срыва"],
  ["С чем сложно", "алкоголь, запрещённые вещества, игромания, не знаю точно"],
  ["Где находится", "Москва и область или другой регион"],
  ["Формат", "стационар, амбулаторно, срочно (запой или ломка), сначала разобраться, бюджетный вариант"],
  ["Согласен на помощь", "да, сомневается, отказывается"],
  ["Когда связаться", "сейчас, утром, днём, вечером, написать"],
];

const LeadParseSettings = ({ isAdmin }: { isAdmin: boolean }) => {
  const qc = useQueryClient();
  const { data } = useQuery<{ auto: boolean; pending: number }>({ queryKey: ["crm", "lead_parse"], queryFn: () => api({ resource: "lead_parse", action: "settings" }) });
  const save = useMutation({
    mutationFn: (auto: boolean) => api({ resource: "lead_parse", action: "settings" }, "POST", { auto }),
    onSuccess: (_, auto) => { toast.success(auto ? "Новые лиды из API будут разбираться автоматически" : "Автоматический разбор выключен"); qc.invalidateQueries({ queryKey: ["crm"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const all = useMutation({
    mutationFn: () => api<{ done: number }>({ resource: "lead_parse", action: "all" }, "POST", {}),
    onSuccess: (r) => { toast.success(`Разобрано лидов: ${r.done}`); qc.invalidateQueries({ queryKey: ["crm"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon name="Wand2" size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold">Разбор комментариев лидов</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Формы сайта присылают ответы кодами (h_who: self, m_what: alco…). Разбор переводит их в понятный текст, ставит теги зависимости и помощи, заполняет тему и контактное лицо. Исходный комментарий сохраняется.
          </p>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-lg bg-secondary/60 px-4 py-3">
        <Switch checked={!!data?.auto} disabled={!isAdmin || save.isPending} onCheckedChange={(v) => save.mutate(v)} />
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-medium">Обрабатывать автоматически</span>
          <span className="block text-xs text-muted-foreground">{isAdmin ? "Каждый новый лид из API разбирается сразу при поступлении" : "Включает администратор"}</span>
        </span>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" disabled={!data?.pending || all.isPending} onClick={() => all.mutate()}>
          <Icon name={all.isPending ? "Loader2" : "ListChecks"} size={14} className={`mr-1.5 ${all.isPending ? "animate-spin" : ""}`} />
          Разобрать необработанные{data?.pending ? ` (${data.pending})` : ""}
        </Button>
        <span className="text-xs text-muted-foreground">Отдельный лид можно разобрать кнопкой в его карточке</span>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Что распознаётся</summary>
        <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[180px_1fr]">
          {MAP.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Теги: алкоголь → «Алкоголизм», вещества → «Наркомания», игромания → «Игромания», стационар → «Стационар», срочно → «Вывод из запоя» или «Детоксикация». Если помощь нужна близкому — заявитель записывается контактным лицом.
        </p>
      </details>
    </div>
  );
};

export default LeadParseSettings;
