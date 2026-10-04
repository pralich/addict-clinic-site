type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  kind?: "consent" | "offer";
  error?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

const ConsentCheckbox = ({ checked, onChange, kind = "consent", error, tone = "light", className = "" }: Props) => {
  const muted = tone === "dark" ? "text-white/60" : "text-muted-foreground";
  const link = tone === "dark" ? "text-white underline underline-offset-2 hover:text-white/80" : "text-foreground underline underline-offset-2 hover:text-primary";
  const box = tone === "dark" ? "border-white/30 bg-white/5" : "border-foreground/25 bg-card";

  return (
    <label className={`flex cursor-pointer items-start gap-2.5 text-left text-xs leading-relaxed ${muted} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={error || undefined}
        className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[hsl(var(--primary))] ${box} ${error ? "outline outline-2 outline-offset-1 outline-primary" : ""}`}
      />
      {kind === "consent" ? (
        <span>
          Даю{" "}
          <a href="/consent" target="_blank" rel="noopener" className={link} onClick={(e) => e.stopPropagation()}>
            согласие на обработку персональных данных
          </a>
          , включая сведения о здоровье, на условиях{" "}
          <a href="/privacy" target="_blank" rel="noopener" className={link} onClick={(e) => e.stopPropagation()}>
            Политики обработки персональных данных
          </a>
        </span>
      ) : (
        <span>
          Принимаю условия{" "}
          <a href="/offer" target="_blank" rel="noopener" className={link} onClick={(e) => e.stopPropagation()}>
            публичной оферты
          </a>
        </span>
      )}
    </label>
  );
};

export default ConsentCheckbox;
