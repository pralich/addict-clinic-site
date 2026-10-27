import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { applyCookieChoice, getCookieChoice, saveCookieChoice } from "@/lib/cookie-consent";

const CookieBanner = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    applyCookieChoice();
    if (!getCookieChoice()) setOpen(true);
    const onOpen = () => {
      setAnalytics(!!getCookieChoice()?.analytics);
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener("cookie-settings-open", onOpen);
    return () => window.removeEventListener("cookie-settings-open", onOpen);
  }, []);

  if (!open || /^\/(admin|partner)/.test(pathname)) return null;

  const choose = (a: boolean) => {
    saveCookieChoice(a);
    setOpen(false);
    setDetails(false);
  };

  return (
    <div role="dialog" aria-label="Настройки cookie" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[560px] rounded-2xl border bg-card p-5 shadow-2xl md:inset-x-auto md:left-5 md:mx-0 print:hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><Icon name="Cookie" size={20} /></span>
        <div className="text-sm">
          <p className="font-medium">Мы используем cookie</p>
          <p className="mt-1 text-muted-foreground">
            Необходимые и статистика «Яндекс Метрики» — чтобы сайт работал и становился удобнее. Дополнительная аналитика — только с вашего согласия.{" "}
            <a href="/cookies" className="text-foreground underline underline-offset-2">Подробнее</a>
          </p>
        </div>
      </div>

      {details && (
        <div className="mt-4 flex flex-col gap-1 rounded-xl bg-secondary/60 p-2">
          <div className="flex items-center gap-3 rounded-lg p-2.5">
            <span className="flex-1 text-sm"><span className="block font-medium">Необходимые</span><span className="block text-xs text-muted-foreground">Корзина, вход в кабинет, настройки, статистика Яндекс Метрики</span></span>
            <span className="text-xs text-muted-foreground">Всегда</span>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 hover:bg-secondary">
            <span className="flex-1 text-sm"><span className="block font-medium">Аналитические</span><span className="block text-xs text-muted-foreground">Другие счётчики посещаемости</span></span>
            <Switch checked={analytics} onCheckedChange={setAnalytics} />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => choose(true)} className="h-10 flex-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Принять все</button>
        {details ? (
          <button onClick={() => choose(analytics)} className="h-10 flex-1 rounded-full border px-4 text-sm font-medium hover:bg-secondary">Сохранить выбор</button>
        ) : (
          <button onClick={() => choose(false)} className="h-10 flex-1 rounded-full border px-4 text-sm font-medium hover:bg-secondary">Только необходимые</button>
        )}
        {!details && (
          <button onClick={() => setDetails(true)} className="h-10 px-2 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Настроить</button>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
