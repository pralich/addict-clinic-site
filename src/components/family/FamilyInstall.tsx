import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const FamilyInstall = ({ variant = "card" }: { variant?: "card" | "icon" }) => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
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
    ? ["Откройте кабинет в Safari", "Нажмите «Поделиться» внизу экрана", "Выберите «На экран „Домой“» → «Добавить»"]
    : ["Откройте меню браузера ⋮ или значок установки в адресной строке", "Выберите «Установить приложение» или «Добавить на главный экран»", "Кабинет откроется отдельным приложением со своей иконкой"];

  return (
    <>
      {variant === "icon" ? (
        <button onClick={install} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground" aria-label="Установить приложение">
          <Icon name="Download" size={16} />
        </button>
      ) : (
        <button onClick={install} className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-primary/10 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/15">
          <img src="/family-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="flex-1">
            <span className="block font-medium leading-tight">Установить приложение</span>
            <span className="block text-[11px] text-muted-foreground">Кабинет на экране телефона</span>
          </span>
          <Icon name="Download" size={16} className="text-primary" />
        </button>
      )}
      <Dialog open={guide} onOpenChange={setGuide}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <div className="flex items-center gap-3">
            <img src="/family-192.png" alt="" className="h-12 w-12 rounded-xl" />
            <div>
              <DialogTitle className="font-heading text-lg">Кабинет для близких</DialogTitle>
              <p className="text-sm text-muted-foreground">Отдельное приложение на телефоне</p>
            </div>
          </div>
          <ol className="mt-2 flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FamilyInstall;
