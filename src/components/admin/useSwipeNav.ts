import { useEffect, useRef } from "react";

type Opts = {
  enabled: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  readyKey: unknown;
};

const SKIP = 'input, textarea, select, [contenteditable="true"], [data-no-swipe]';

const scrollsX = (el: HTMLElement | null, stop: HTMLElement) => {
  for (let n = el; n && n !== stop; n = n.parentElement) {
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
};

export const useSwipeNav = ({ enabled, canPrev, canNext, onPrev, onNext, readyKey }: Opts) => {
  const ref = useRef<HTMLDivElement>(null);
  const opts = useRef({ canPrev, canNext, onPrev, onNext });
  opts.current = { canPrev, canNext, onPrev, onNext };
  const enter = useRef<0 | 1 | -1>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enter.current) return;
    const from = enter.current * 28;
    enter.current = 0;
    el.animate([{ transform: `translateX(${from}%)`, opacity: 0.2 }, { transform: "translateX(0)", opacity: 1 }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, [readyKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const mobile = window.matchMedia("(max-width: 1023px)");
    let sx = 0, sy = 0, st = 0, dx = 0, mode: "idle" | "wait" | "x" | "y" = "idle";

    const set = (x: number, animate = false) => {
      el.style.transition = animate ? "transform .2s ease, opacity .2s ease" : "none";
      el.style.transform = x ? `translateX(${x}px)` : "";
      el.style.opacity = x ? String(Math.max(0.55, 1 - Math.abs(x) / 600)) : "";
    };

    const start = (e: TouchEvent) => {
      mode = "idle";
      if (!mobile.matches || e.touches.length !== 1) return;
      const t = e.touches[0];
      const target = e.target as HTMLElement;
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
      if (target.closest(SKIP) || scrollsX(target, el)) return;
      sx = t.clientX; sy = t.clientY; st = Date.now(); dx = 0; mode = "wait";
    };

    const move = (e: TouchEvent) => {
      if (mode === "idle" || mode === "y") return;
      const t = e.touches[0];
      const mx = t.clientX - sx, my = t.clientY - sy;
      if (mode === "wait") {
        if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
        mode = Math.abs(mx) > Math.abs(my) * 1.3 ? "x" : "y";
        if (mode === "y") return;
      }
      const { canPrev: p, canNext: n } = opts.current;
      const blocked = (mx > 0 && !p) || (mx < 0 && !n);
      dx = blocked ? mx * 0.2 : mx * 0.75;
      set(dx);
    };

    const end = () => {
      if (mode !== "x") { mode = "idle"; return; }
      mode = "idle";
      const { canPrev: p, canNext: n, onPrev, onNext } = opts.current;
      const fast = Math.abs(dx) > 40 && Date.now() - st < 300;
      const far = Math.abs(dx) > el.clientWidth * 0.25;
      const dir = dx < 0 ? 1 : -1;
      if ((fast || far) && (dir === 1 ? n : p)) {
        navigator.vibrate?.(8);
        set(-dir * el.clientWidth * 0.6, true);
        enter.current = dir;
        window.setTimeout(() => { set(0); (dir === 1 ? onNext : onPrev)(); }, 160);
      } else {
        set(0, true);
      }
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      set(0);
    };
  }, [enabled]);

  return ref;
};
