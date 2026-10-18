import { useEffect, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { crmPushState, disableCrmPush, enableCrmPush, saveCrmPushPrefs, sendCrmTest, type CrmPushPrefs, type CrmPushState } from "@/lib/crm-push";

const HINT: Record<CrmPushState, string> = {
  unsupported: "Этот браузер не поддерживает уведомления",
  "ios-install": "На iPhone сначала установите CRM на экран «Домой»",
  denied: "Уведомления запрещены в настройках браузера для этого сайта",
  off: "Выключены на этом устройстве",
  on: "Включены на этом устройстве",
};

const PushSettings = ({ variant = "sidebar" }: { variant?: "sidebar" | "icon" }) => {
  const [state, setState] = useState<CrmPushState | null>(null);
  const [prefs, setPrefs] = useState<CrmPushPrefs>({ notify_leads: true, notify_orders: true, notify_tasks: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    crmPushState().then((r) => {
      setState(r.state);
      setPrefs(r.prefs);
    });
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === "on") {
        await disableCrmPush();
        setState("off");
        toast("Уведомления выключены");
      } else {
        await enableCrmPush();
        setState("on");
        toast.success("Готово — пришло тестовое уведомление");
      }
    } catch (e) {
      toast.error((e as Error).message);
      setState((await crmPushState()).state);
    } finally {
      setBusy(false);
    }
  };

  const update = async (k: keyof CrmPushPrefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    await saveCrmPushPrefs(next).catch(() => toast.error("Не удалось сохранить"));
  };

  if (!state) return null;
  const on = state === "on";
  const canToggle = state === "on" || state === "off";

  const trigger =
    variant === "icon" ? (
      <button className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary" aria-label="Уведомления">
        <Icon name={on ? "BellRing" : "BellOff"} size={19} />
        {on && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />}
      </button>
    ) : (
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-night-muted transition-colors hover:bg-white/5 hover:text-white">
        <Icon name={on ? "BellRing" : "BellOff"} size={16} className={on ? "text-emerald-400" : ""} />
        <span className="flex-1">Уведомления</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${on ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10"}`}>{on ? "Вкл" : "Выкл"}</span>
      </button>
    );

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side={variant === "icon" ? "bottom" : "right"} align="end" className="w-[min(320px,calc(100vw-2rem))] rounded-2xl p-0">
        <div className="flex items-start gap-3 border-b p-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-100 text-emerald-700" : "bg-secondary"}`}>
            <Icon name={on ? "BellRing" : "Bell"} size={20} />
          </span>
          <div className="flex-1">
            <p className="font-medium">Push-уведомления</p>
            <p className="text-xs text-muted-foreground">{HINT[state]}</p>
          </div>
          {canToggle && <Switch checked={on} disabled={busy} onCheckedChange={toggle} />}
        </div>

        {state === "off" && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Узнавайте о новых заявках и оплатах сразу — даже когда CRM закрыта.</p>
            <button onClick={toggle} disabled={busy} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="BellPlus" size={16} />}Включить на этом устройстве
            </button>
          </div>
        )}

        {on && (
          <div className="flex flex-col gap-1 p-2">
            {[
              { k: "notify_leads" as const, icon: "Inbox", t: "Новые лиды", d: "Заявки с сайта" },
              { k: "notify_orders" as const, icon: "ShoppingBag", t: "Оплаченные заказы", d: "Покупки в магазине" },
              { k: "notify_tasks" as const, icon: "ListTodo", t: "Мои задачи", d: "Новые задачи, сроки и комментарии" },
            ].map((r) => (
              <label key={r.k} className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 hover:bg-secondary">
                <Icon name={r.icon} size={18} className="text-muted-foreground" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{r.t}</span>
                  <span className="block text-xs text-muted-foreground">{r.d}</span>
                </span>
                <Switch checked={prefs[r.k]} onCheckedChange={(v) => update(r.k, v)} />
              </label>
            ))}
            <button onClick={() => sendCrmTest().then(() => toast("Тест отправлен"))} className="mx-2 mb-1 mt-1 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Icon name="Send" size={13} />Отправить тестовое уведомление
            </button>
          </div>
        )}

        {state === "ios-install" && (
          <ol className="flex flex-col gap-2 p-4 text-sm">
            <li>1. Нажмите «Поделиться» в Safari</li>
            <li>2. «На экран „Домой“» → «Добавить»</li>
            <li>3. Откройте CRM с иконки и включите здесь</li>
          </ol>
        )}
        {state === "denied" && (
          <p className="p-4 text-sm text-muted-foreground">Нажмите на значок замка в адресной строке → «Уведомления» → «Разрешить», затем обновите страницу.</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default PushSettings;
