import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const AdminInstall = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!deferred) return setGuide(true);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const steps = isIos()
    ? ["Откройте CRM в Safari", "Нажмите «Поделиться» внизу экрана", "Выберите «На экран „Домой“» → «Добавить»"]
    : ["Откройте меню браузера ⋮ или значок установки в адресной строке", "Выберите «Установить приложение»", "CRM откроется в отдельном окне со своей иконкой"];

  return (
    <>
      <button onClick={install} className="flex w-full items-center gap-3 rounded-lg bg-primary/15 px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-primary/25">
        <Icon name="MonitorSmartphone" size={16} className="text-primary" />
        <span className="flex-1">
          <span className="block font-medium leading-tight">Установить CRM</span>
          <span className="block text-[11px] text-night-muted">Отдельное приложение</span>
        </span>
      </button>
      <Dialog open={guide} onOpenChange={setGuide}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <div className="flex items-center gap-3">
            <img src="/admin-192.png" alt="" className="h-12 w-12 rounded-xl" />
            <div>
              <DialogTitle className="font-heading text-lg">Установить Clinic CRM</DialogTitle>
              <p className="text-sm text-muted-foreground">Отдельно от сайта клиники</p>
            </div>
          </div>
          <ol className="mt-2 flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminInstall;
