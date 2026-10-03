import { Fragment, type ReactNode } from "react";

const inline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );

const AiMarkdown = ({ text }: { text: string }) => {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list;
    out.push(
      L.ordered ? (
        <ol key={out.length} className="my-2 list-decimal space-y-1 pl-5">{L.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</ol>
      ) : (
        <ul key={out.length} className="my-2 list-disc space-y-1 pl-5">{L.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</ul>
      ),
    );
    list = null;
  };
  lines.forEach((raw) => {
    const l = raw.trim();
    const ul = l.match(/^[-*•] (.+)/);
    const ol = l.match(/^\d+[.)] (.+)/);
    if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((ul || ol)![1]);
      return;
    }
    flush();
    if (!l) return;
    const h = l.match(/^#{1,4} (.+)/);
    if (h) out.push(<p key={out.length} className="mt-3 font-semibold">{inline(h[1])}</p>);
    else out.push(<p key={out.length} className="my-1.5">{inline(l)}</p>);
  });
  flush();
  return <div className="leading-relaxed [&>*:first-child]:mt-0">{out}</div>;
};

export default AiMarkdown;
