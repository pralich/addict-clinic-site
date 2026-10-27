import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const KEY = "pwa_prompt_dismissed_at";
const SNOOZE_DAYS = 14;
const DELAY_MS = 25000;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const platform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
};

const snoozed = () => {
  const at = Number(localStorage.getItem(KEY) || 0);
  return Date.now() - at < SNOOZE_DAYS * 86400000;
};

const STEPS: Record<string, { icon: string; text: React.ReactNode }[]> = {
  ios: [
    { icon: "Share", text: <>Нажмите <b>«Поделиться»</b> внизу экрана Safari</> },
    { icon: "SquarePlus", text: <>Выберите <b>«На экран „Домой“»</b></> },
    { icon: "Check", text: <>Нажмите <b>«Добавить»</b> в правом верхнем углу</> },
  ],
  android: [
    { icon: "EllipsisVertical", text: <>Откройте меню браузера <b>⋮</b> справа вверху</> },
    { icon: "SquarePlus", text: <>Выберите <b>«Добавить на главный экран»</b> или <b>«Установить приложение»</b></> },
    { icon: "Check", text: <>Подтвердите — иконка появится на рабочем столе</> },
  ],
  desktop: [
    { icon: "MonitorDown", text: <>Нажмите значок установки в адресной строке браузера</> },
    { icon: "EllipsisVertical", text: <>Или откройте меню браузера → <b>«Установить приложение»</b></> },
    { icon: "Check", text: <>Сайт откроется в отдельном окне, как программа</> },
  ],
};

const InstallPrompt = () => {
  const { pathname } = useLocation();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const os = platform();

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setOpen(false);
      localStorage.setItem(KEY, String(Date.now() + 3650 * 86400000));
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  if (!open || /^\/(admin|partner)/.test(pathname)) return null;

  const close = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setOpen(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "accepted") return setOpen(false);
      return close();
    }
    setGuide(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px]">
      <div className="animate-in fade-in slide-in-from-bottom-4 overflow-hidden rounded-2xl border bg-card shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] duration-500">
        <div className="flex items-start gap-3 p-4">
          <img src="/pwa-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold leading-tight">Добавьте addict.clinic на рабочий стол</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">Помощь 24/7 и кабинет для близких — в одно касание, как приложение. Без App Store.</p>
          </div>
          <button onClick={close} aria-label="Закрыть" className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        {guide ? (
          <div className="border-t bg-background/60 p-4">
            <ol className="flex flex-col gap-3">
              {STEPS[os].map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon name={s.icon} size={16} fallback="Circle" />
                  </span>
                  <span className="leading-snug">{s.text}</span>
                </li>
              ))}
            </ol>
            <button onClick={close} className="mt-4 h-10 w-full rounded-xl bg-ink text-sm font-medium text-ink-foreground hover:opacity-90">Понятно</button>
          </div>
        ) : (
          <div className="flex gap-2 px-4 pb-4">
            <button onClick={install} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:opacity-90">
              <Icon name="Download" size={16} />
              {deferred ? "Установить" : "Как добавить"}
            </button>
            <button onClick={close} className="h-10 rounded-xl bg-secondary px-4 text-sm font-medium hover:bg-secondary/70">Позже</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
