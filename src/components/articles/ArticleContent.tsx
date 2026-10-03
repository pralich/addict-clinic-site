import { Fragment, type ReactNode } from "react";
import Icon from "@/components/ui/icon";

type Block =
  | { t: "h2" | "h3" | "p" | "quote"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "img"; src: string; alt: string }
  | { t: "stats" | "checklist" | "steps"; lines: string[] }
  | { t: "callout"; kind: string; text: string };

export const slugifyHeading = (s: string) =>
  s.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");

export const parseContent = (src: string): Block[] => {
  const lines = src.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const tr = line.trim();
    if (!tr) { i++; continue; }
    const custom = tr.match(/^:::(\w+)\s*(\w+)?/);
    if (custom) {
      const kind = custom[1];
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") { if (lines[i].trim()) inner.push(lines[i].trim()); i++; }
      i++;
      if (kind === "callout") blocks.push({ t: "callout", kind: custom[2] || "info", text: inner.join(" ") });
      else if (kind === "stats" || kind === "checklist" || kind === "steps") blocks.push({ t: kind, lines: inner });
      continue;
    }
    if (tr.startsWith("### ")) { blocks.push({ t: "h3", text: tr.slice(4) }); i++; continue; }
    if (tr.startsWith("## ")) { blocks.push({ t: "h2", text: tr.slice(3) }); i++; continue; }
    if (tr.startsWith("> ")) { blocks.push({ t: "quote", text: tr.slice(2) }); i++; continue; }
    const img = tr.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (img) { blocks.push({ t: "img", alt: img[1], src: img[2] }); i++; continue; }
    if (tr.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ t: "table", head: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (/^[-*] /.test(tr)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
      blocks.push({ t: "ul", items });
      continue;
    }
    if (/^\d+[.)] /.test(tr)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)] /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+[.)] /, "")); i++; }
      blocks.push({ t: "ol", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |> |\||[-*] |\d+[.)] |:::|!\[)/.test(lines[i].trim())) { para.push(lines[i].trim()); i++; }
    blocks.push({ t: "p", text: para.join(" ") });
  }
  return blocks;
};

const inline = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} className="font-medium text-primary underline underline-offset-4">{link[1]}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
};

const CALLOUT: Record<string, { icon: string; cls: string; title: string }> = {
  warning: { icon: "TriangleAlert", cls: "border-primary/30 bg-primary/[0.06]", title: "Важно" },
  info: { icon: "Info", cls: "border-sky-300/60 bg-sky-50", title: "Обратите внимание" },
  tip: { icon: "Lightbulb", cls: "border-emerald-300/60 bg-emerald-50", title: "Совет" },
};

const ArticleContent = ({ content }: { content: string }) => {
  const blocks = parseContent(content);
  return (
    <div className="article-body text-[1.08em] leading-[1.75] text-foreground/85">
      {blocks.map((b, idx) => {
        switch (b.t) {
          case "h2":
            return <h2 key={idx} id={slugifyHeading(b.text)} className="mt-12 scroll-mt-24 font-heading text-[1.65em] font-semibold leading-tight tracking-[-0.03em] text-foreground">{b.text}</h2>;
          case "h3":
            return <h3 key={idx} className="mt-8 font-heading text-[1.25em] font-semibold tracking-tight text-foreground">{b.text}</h3>;
          case "p":
            return <p key={idx} className="mt-5">{inline(b.text)}</p>;
          case "quote":
            return (
              <blockquote key={idx} className="relative my-10 rounded-2xl bg-ink px-7 py-8 text-ink-foreground md:px-10">
                <Icon name="Quote" size={28} className="absolute -top-3 left-6 rounded-full bg-primary p-1.5 text-primary-foreground" />
                <p className="font-heading text-[1.25em] font-medium leading-snug tracking-tight">{inline(b.text)}</p>
              </blockquote>
            );
          case "ul":
            return (
              <ul key={idx} className="mt-5 space-y-2.5">
                {b.items.map((it, k) => (
                  <li key={k} className="flex gap-3"><span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>{inline(it)}</span></li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="mt-5 space-y-2.5">
                {b.items.map((it, k) => (
                  <li key={k} className="flex gap-3"><span className="font-heading font-semibold text-primary">{k + 1}.</span><span>{inline(it)}</span></li>
                ))}
              </ol>
            );
          case "img":
            return (
              <figure key={idx} className="my-8">
                <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-2xl object-cover" />
                {b.alt && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{b.alt}</figcaption>}
              </figure>
            );
          case "table":
            return (
              <div key={idx} className="my-8 overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full min-w-[480px] text-[0.92em]">
                  <thead>
                    <tr className="bg-ink text-ink-foreground">
                      {b.head.map((h, k) => <th key={k} className="px-4 py-3 text-left font-heading font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, k) => (
                      <tr key={k} className="border-t">
                        {r.map((c, j) => <td key={j} className={`px-4 py-3 align-top ${j === 0 ? "font-medium text-foreground" : ""}`}>{inline(c)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "stats":
            return (
              <div key={idx} className="my-8 grid gap-3 sm:grid-cols-3">
                {b.lines.map((l, k) => {
                  const [v, label] = l.split("|");
                  return (
                    <div key={k} className="rounded-2xl bg-card p-5">
                      <p className="font-heading text-[2em] font-semibold leading-none tracking-[-0.04em] text-primary">{v}</p>
                      <p className="mt-2 text-[0.85em] leading-snug text-muted-foreground">{label}</p>
                    </div>
                  );
                })}
              </div>
            );
          case "checklist":
            return (
              <div key={idx} className="my-6 grid gap-2 sm:grid-cols-2">
                {b.lines.map((l, k) => (
                  <div key={k} className="flex items-start gap-3 rounded-xl bg-card px-4 py-3 text-[0.95em]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Icon name="Check" size={13} /></span>
                    <span>{inline(l)}</span>
                  </div>
                ))}
              </div>
            );
          case "steps":
            return (
              <ol key={idx} className="my-8 space-y-0">
                {b.lines.map((l, k) => {
                  const [title, text] = l.split("|");
                  return (
                    <li key={k} className="relative flex gap-5 pb-6 last:pb-0">
                      {k < b.lines.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-px bg-border" />}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-heading font-semibold text-ink-foreground">{k + 1}</span>
                      <div className="pt-1.5">
                        <p className="font-heading font-semibold text-foreground">{title}</p>
                        {text && <p className="mt-1 text-[0.95em] text-muted-foreground">{inline(text)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          case "callout": {
            const c = CALLOUT[b.kind] || CALLOUT.info;
            return (
              <div key={idx} className={`my-8 flex gap-4 rounded-2xl border p-5 ${c.cls}`}>
                <Icon name={c.icon} size={22} className={`shrink-0 ${b.kind === "warning" ? "text-primary" : "text-foreground/70"}`} />
                <div>
                  <p className="font-heading font-semibold text-foreground">{c.title}</p>
                  <p className="mt-1 text-[0.95em]">{inline(b.text)}</p>
                </div>
              </div>
            );
          }
        }
      })}
    </div>
  );
};

export default ArticleContent;
