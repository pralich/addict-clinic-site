import type { ReactNode } from "react";
import Reveal from "./Reveal";

interface SectionHeadProps {
  label: string;
  title: ReactNode;
  text?: ReactNode;
  dark?: boolean;
}

const SectionHead = ({ label, title, text, dark }: SectionHeadProps) => (
  <Reveal className="mb-10 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
    <div>
      <span
        className={`flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight ${
          dark ? "text-night-muted" : "text-muted-foreground"
        }`}
      >
        <i className="block h-2.5 w-2.5 rotate-45 bg-primary" />
        {label}
      </span>
      <h2
        className="mt-4 font-heading font-medium"
        style={{ fontSize: "clamp(30px, 4.2vw, 46px)", lineHeight: 1.08, letterSpacing: "-0.045em" }}
      >
        {title}
      </h2>
    </div>
    {text && (
      <p className={`text-[1.07em] leading-[1.45] ${dark ? "text-night-muted" : "text-muted-foreground"}`}>{text}</p>
    )}
  </Reveal>
);

export default SectionHead;
