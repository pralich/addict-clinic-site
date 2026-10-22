import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { GOALS } from "@/lib/goals";

const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success(`Скопировано: ${v}`));

const SeoGoals = () => (
  <div className="mt-6 rounded-2xl border bg-card p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><Icon name="Target" size={20} /></span>
      <div>
        <p className="font-heading font-semibold">Цели Яндекс Метрики</p>
        <p className="text-sm text-muted-foreground">
          Сайт уже отправляет эти события. В Метрике: Цели → Добавить цель → «JavaScript-событие» → вставьте идентификатор. Нажмите на идентификатор, чтобы скопировать.
        </p>
      </div>
    </div>
    <div className="mt-4 divide-y rounded-xl border">
      {GOALS.map((g) => (
        <div key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
          <button onClick={() => copy(g.id)} className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 font-mono text-xs hover:bg-secondary/70">
            {g.id}<Icon name="Copy" size={12} className="text-muted-foreground" />
          </button>
          <span className="font-medium">{g.title}</span>
          {g.hint && <span className="text-muted-foreground">{g.hint}</span>}
        </div>
      ))}
    </div>
  </div>
);

export default SeoGoals;
