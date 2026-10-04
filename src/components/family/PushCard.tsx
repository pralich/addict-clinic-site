import { useEffect, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { disablePush, enablePush, pushState, pushTick, type PushState } from "@/lib/push";

const TICK_KEY = "family_push_tick_at";

const PushCard = ({ compact = false }: { compact?: boolean }) => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
    const last = Number(sessionStorage.getItem(TICK_KEY) || 0);
    if (Date.now() - last > 5 * 60000) {
      sessionStorage.setItem(TICK_KEY, String(Date.now()));
      pushTick();
    }
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === "on") {
        await disablePush();
        setState("off");
        toast("Уведомления отключены");
      } else {
        await enablePush();
        setState("on");
        toast.success("Уведомления включены — отправили тестовое");
      }
    } catch (e) {
      toast.error((e as Error).message);
      setState(await pushState().catch(() => "unsupported" as PushState));
    } finally {
      setBusy(false);
    }
  };

  if (!state || state === "unsupported") return null;

  if (compact) {
    if (state === "ios-install" || state === "denied") return null;
    return (
      <button onClick={toggle} disabled={busy}
        className="mx-3 mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/75 transition-colors hover:bg-secondary disabled:opacity-60">
        <Icon name={state === "on" ? "BellRing" : "BellOff"} size={18} className={state === "on" ? "text-primary" : ""} />
        Уведомления
        <span className={`ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${state === "on" ? "bg-primary" : "bg-secondary"}`}>
          <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${state === "on" ? "translate-x-4" : ""}`} />
        </span>
      </button>
    );
  }

  if (state === "on") return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon name="BellRing" size={20} /></span>
      <div className="flex-1">
        <p className="font-heading font-semibold">Включите уведомления</p>
        {state === "ios-install" ? (
          <p className="mt-0.5 text-sm text-muted-foreground">На iPhone уведомления работают, когда сайт добавлен на экран «Домой»: «Поделиться» → «На экран „Домой“», затем откройте кабинет с иконки.</p>
        ) : state === "denied" ? (
          <p className="mt-0.5 text-sm text-muted-foreground">Уведомления запрещены в настройках браузера. Разрешите их для этого сайта (значок замка в адресной строке) и обновите страницу.</p>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">Сообщим, когда психолог ответит на ваш вопрос, и напомним о встрече или вебинаре за час до начала.</p>
        )}
      </div>
      {state === "off" && (
        <button onClick={toggle} disabled={busy} className="h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "Включаем…" : "Включить"}
        </button>
      )}
    </div>
  );
};

export default PushCard;
