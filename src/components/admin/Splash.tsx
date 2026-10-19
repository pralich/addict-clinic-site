import { useEffect, useState } from "react";

type Props = { ready: boolean; caption?: string; minMs?: number; logo?: string; onDone?: () => void };

const BRAND = "addict.clinic";

const Splash = ({ ready, caption = "CRM", minMs = 1500, logo = "/admin-192.png", onDone }: Props) => {
  const [minPassed, setMinPassed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinPassed(true), minMs);
    return () => window.clearTimeout(t);
  }, [minMs]);

  useEffect(() => {
    if (!ready || !minPassed || leaving) return;
    setLeaving(true);
    const t = window.setTimeout(() => { setGone(true); onDone?.(); }, 650);
    return () => window.clearTimeout(t);
  }, [ready, minPassed, leaving, onDone]);

  if (gone) return null;

  return (
    <div
      aria-busy={!leaving}
      aria-label="Загрузка"
      className={`splash fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-night text-night-foreground ${leaving ? "splash-out" : ""}`}
    >
      <div className="splash-glow splash-glow-a" />
      <div className="splash-glow splash-glow-b" />
      <div className="splash-grid" />

      <div className="relative flex flex-col items-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="splash-ring" />
          <span className="splash-ring [animation-delay:.8s]" />
          <span className="splash-ring [animation-delay:1.6s]" />
          <svg className="splash-orbit absolute inset-0" viewBox="0 0 144 144" fill="none">
            <circle cx="72" cy="72" r="66" stroke="hsl(var(--night-foreground) / .08)" strokeWidth="2" />
            <circle cx="72" cy="72" r="66" stroke="url(#splash-g)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="110 305" />
            <defs>
              <linearGradient id="splash-g" x1="0" y1="0" x2="144" y2="144">
                <stop stopColor="hsl(var(--primary))" />
                <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <img src={logo} alt="" className="splash-logo relative h-20 w-20 rounded-[22px] shadow-[0_20px_60px_-10px_hsl(var(--primary)/.6)]" />
        </div>

        <p className="mt-8 flex font-heading text-2xl font-semibold tracking-tight">
          {BRAND.split("").map((ch, i) => (
            <span key={i} className="splash-letter" style={{ animationDelay: `${300 + i * 45}ms` }}>{ch}</span>
          ))}
        </p>
        <p className="splash-caption mt-1.5 text-xs uppercase tracking-[0.35em] text-night-muted">{caption}</p>

        <div className="mt-8 h-[3px] w-40 overflow-hidden rounded-full bg-night-foreground/10">
          <div className={`splash-bar h-full rounded-full bg-primary ${ready ? "splash-bar-done" : ""}`} />
        </div>
      </div>
    </div>
  );
};

export default Splash;
