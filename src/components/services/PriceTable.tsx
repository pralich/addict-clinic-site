import type { PriceGroup } from "@/lib/services";

const PriceTable = ({ groups }: { groups: PriceGroup[] }) => (
  <div className="grid gap-[7px] lg:grid-cols-2">
    {groups.map((g) => (
      <div key={g.title} className="rounded-xl bg-card p-5 md:p-6">
        <h3 className="mb-3 font-heading text-[1.2em] font-medium tracking-tight">{g.title}</h3>
        <ul className="divide-y">
          {g.items.map((i) => (
            <li key={i.name} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  {i.name}
                  {i.hit && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Чаще выбирают</span>}
                </p>
                {i.note && <p className="mt-0.5 text-sm text-muted-foreground">{i.note}</p>}
              </div>
              <p className="shrink-0 whitespace-nowrap text-right font-heading font-semibold">
                {i.price}
                {i.unit && <span className="block text-xs font-normal text-muted-foreground">за {i.unit}</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export default PriceTable;
