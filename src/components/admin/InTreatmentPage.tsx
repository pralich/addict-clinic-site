import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/crm-api";
import StatusBadge from "./StatusBadge";
import { DEAL_STAGES, REP_RELATIONS, commissionAmount, commissionText, daysUntil, fmtDate, money } from "./config";
import { DueBadge, InvoiceButton } from "./billing/NextPayment";

type Row = Record<string, any>;
type Data = { date: string; items: Row[]; upcoming: Row[]; no_dates: number };

const DAY = 86400000;
const toDay = (v: string) => new Date(String(v).slice(0, 10) + "T00:00:00");
const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const Stat = ({ icon, label, value, cls = "" }: { icon: string; label: string; value: number | string; cls?: string }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon name={icon} size={14} />{label}</div>
    <p className={`mt-1.5 font-heading text-2xl font-semibold ${cls}`}>{value}</p>
  </div>
);

const Progress = ({ r, day }: { r: Row; day: Date }) => {
  const start = toDay(r.check_in_date).getTime();
  const end = toDay(r.check_out_date).getTime();
  const total = Math.max(1, Math.round((end - start) / DAY));
  const passed = Math.min(total, Math.max(0, Math.round((day.getTime() - start) / DAY)));
  const left = Math.max(0, Math.round((end - day.getTime()) / DAY));
  return (
    <div className="min-w-[180px]">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{fmtDate(r.check_in_date)}</span>
        <span>{fmtDate(r.check_out_date)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-violet-500" style={{ width: `${(passed / total) * 100}%` }} />
      </div>
      <p className={`mt-1 text-xs ${left <= 3 ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
        {left === 0 ? "Выезд сегодня" : `День ${passed + 1} из ${total + 1} · осталось ${left} ${plural(left, "день", "дня", "дней")}`}
      </p>
    </div>
  );
};

const Contacts = ({ r }: { r: Row }) => {
  const repName = r.rep_name || r.client_rep_name;
  const repRel = r.rep_relation || r.client_rep_relation;
  const repPhone = r.rep_phone || r.client_rep_phone;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-primary"><Icon name="Phone" size={13} className="text-muted-foreground" />{r.phone}</a>}
      {r.messenger && <span className="flex items-center gap-1.5"><Icon name="Send" size={13} className="text-muted-foreground" />{r.messenger}</span>}
      {(repName || repPhone) && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon name="UserRound" size={13} />
          <span className="truncate">{repName || "Контакт"}{repRel ? ` (${(REP_RELATIONS[repRel] || repRel).toLowerCase()})` : ""}</span>
          {repPhone && <a href={`tel:${repPhone.replace(/[^\d+]/g, "")}`} onClick={(e) => e.stopPropagation()} className="whitespace-nowrap text-foreground hover:text-primary">{repPhone}</a>}
        </span>
      )}
      {!r.phone && !r.messenger && !repName && !repPhone && <span className="text-muted-foreground">—</span>}
    </div>
  );
};

const rowTone = (r: Row) => {
  const n = daysUntil(r.next_payment_date);
  if (n === null) return "";
  if (n < 0) return "shadow-[inset_3px_0_0_hsl(var(--primary))] bg-primary/[0.03]";
  if (n <= 3) return "shadow-[inset_3px_0_0_#f59e0b] bg-amber-50/50";
  return "";
};

const Payment = ({ r }: { r: Row }) => {
  const deal = { ...r, id: r.deal_id };
  if (!r.next_payment_date)
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-xs text-muted-foreground">{r.payments_total ? "Все платежи выставлены" : "Нет графика"}</span>
        {Number(r.debt) > 0 && <span className="text-xs text-primary">Долг {money(r.debt)}</span>}
      </div>
    );
  return (
    <div className="flex min-w-[150px] flex-col items-start gap-1.5">
      <span className="font-medium tabular-nums">{r.next_payment_amount ? money(r.next_payment_amount) : "—"}</span>
      <span className="text-xs text-muted-foreground">до {fmtDate(r.next_payment_date)} · {r.payment_index} из {r.payments_total}</span>
      <DueBadge date={r.next_payment_date} />
      <InvoiceButton deal={deal} dealId={r.deal_id} compact />
    </div>
  );
};

const Commission = ({ r }: { r: Row }) => {
  const txt = commissionText(r);
  return (
    <div className="flex flex-col">
      <span className="tabular-nums">{money(r.amount)}</span>
      {txt ? <span className="text-xs text-muted-foreground">комиссия {txt}</span> : <span className="text-xs text-muted-foreground">без комиссии</span>}
      {r.partner_name && <span className="max-w-[160px] truncate text-xs text-muted-foreground">{r.partner_name}</span>}
    </div>
  );
};

const InTreatmentPage = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<Data>({ queryKey: ["crm", "in_treatment", date], queryFn: () => api({ resource: "in_treatment", date }) });
  const day = toDay(date);
  const isToday = date === todayIso();

  const items = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = data?.items ?? [];
    const sorted = [...list].sort((a, b) => (daysUntil(a.next_payment_date) ?? 9999) - (daysUntil(b.next_payment_date) ?? 9999));
    return s ? sorted.filter((r) => [r.full_name, r.title, r.program, r.phone, r.rep_name, r.manager_name].some((v) => v && String(v).toLowerCase().includes(s))) : sorted;
  }, [data, search]);

  const stats = useMemo(() => {
    const list = data?.items ?? [];
    const d = day.getTime();
    return {
      total: list.length,
      arrived: list.filter((r) => toDay(r.check_in_date).getTime() === d).length,
      leaving: list.filter((r) => toDay(r.check_out_date).getTime() - d <= 3 * DAY).length,
      payWeek: list.filter((r) => { const n = daysUntil(r.next_payment_date); return n !== null && n <= 7; }),
      commission: list.reduce((a, r) => a + commissionAmount(r), 0),
    };
  }, [data, day]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Сейчас лечатся</h1>
          <p className="text-sm text-muted-foreground">Клиенты, у которых {isToday ? "сегодня" : fmtDate(date)} попадает между датой заезда и выезда по сделке</p>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && <button onClick={() => setDate(todayIso())} className="text-sm text-primary hover:underline">Сегодня</button>}
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-[160px]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon="BedDouble" label="На лечении" value={stats.total} cls="text-violet-700" />
        <Stat icon="LogIn" label="Заезд в этот день" value={stats.arrived} />
        <Stat icon="LogOut" label="Выезд в ближайшие 3 дня" value={stats.leaving} cls={stats.leaving ? "text-amber-700" : ""} />
        <Stat icon="CalendarClock" label="Заезды в ближайшие 14 дней" value={data?.upcoming.length ?? 0} />
        <Stat icon="Wallet" label="Платежи в ближайшие 7 дней" value={money(stats.payWeek.reduce((a, r) => a + Number(r.next_payment_amount || 0), 0))} cls={stats.payWeek.some((r) => (daysUntil(r.next_payment_date) ?? 1) < 0) ? "text-primary" : stats.payWeek.length ? "text-amber-700" : ""} />
        <Stat icon="Percent" label="Комиссия по текущим" value={money(stats.commission)} />
      </div>

      {!!data?.no_dates && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <Icon name="TriangleAlert" size={17} className="mt-0.5 shrink-0" />
          <span>У {data.no_dates} {plural(data.no_dates, "сделки", "сделок", "сделок")} на этапе «Лечение» или «Успешно» не указана дата заезда — такие клиенты не попадают в этот список. Заполните дату заезда и дату выезда (или срок лечения) в карточке сделки.</span>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Icon name="Search" size={16} className="ml-1 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по клиенту, программе, контакту" className="h-8 flex-1 bg-transparent text-sm outline-none" />
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : !items.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-muted-foreground">
            <Icon name="BedDouble" size={32} />
            <p className="font-medium text-foreground">{search ? "Никого не нашли" : "На эту дату никто не лечится"}</p>
            <p className="max-w-[380px] text-sm">Клиент появится здесь, когда в его сделке будут указаны дата заезда и дата выезда (или срок лечения), и выбранная дата окажется между ними.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Клиент</th>
                    <th className="px-4 py-2.5 font-medium">Программа</th>
                    <th className="px-4 py-2.5 font-medium">Период лечения</th>
                    <th className="px-4 py-2.5 font-medium">Сумма и комиссия</th>
                    <th className="px-4 py-2.5 font-medium">Ближайший платёж</th>
                    <th className="px-4 py-2.5 font-medium">Контакты</th>
                    <th className="px-4 py-2.5 font-medium">Ответственный</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.deal_id} onClick={() => onOpen("deals", r.deal_id)} className={`cursor-pointer border-b align-top last:border-0 hover:bg-secondary/50 ${rowTone(r)}`}>
                      <td className="px-4 py-3">
                        {r.client_id ? (
                          <button onClick={(e) => { e.stopPropagation(); onOpen("clients", r.client_id); }} className="text-left font-medium hover:text-primary">{r.full_name}</button>
                        ) : <span className="text-muted-foreground">Клиент не указан</span>}
                        <p className="mt-0.5 max-w-[240px] truncate text-xs text-muted-foreground">{r.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{r.program || "—"}</p>
                        <div className="mt-1"><StatusBadge map={DEAL_STAGES} value={r.stage} /></div>
                      </td>
                      <td className="px-4 py-3"><Progress r={r} day={day} /></td>
                      <td className="px-4 py-3"><Commission r={r} /></td>
                      <td className="px-4 py-3"><Payment r={r} /></td>
                      <td className="px-4 py-3"><Contacts r={r} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{r.manager_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col divide-y lg:hidden">
              {items.map((r) => (
                <div key={r.deal_id} onClick={() => onOpen("deals", r.deal_id)} className={`flex cursor-pointer flex-col gap-3 p-4 active:bg-secondary/50 ${rowTone(r)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.full_name || "Клиент не указан"}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.program || r.title}</p>
                    </div>
                    <StatusBadge map={DEAL_STAGES} value={r.stage} />
                  </div>
                  <Progress r={r} day={day} />
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-secondary/50 p-3">
                    <Commission r={r} />
                    <Payment r={r} />
                  </div>
                  <Contacts r={r} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!!data?.upcoming.length && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Скоро заезд</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.upcoming.map((r) => (
              <button key={r.deal_id} onClick={() => onOpen("deals", r.deal_id)} className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-foreground/20">
                <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-xs leading-tight">
                  <b className="text-sm">{toDay(r.check_in_date).getDate()}</b>
                  {toDay(r.check_in_date).toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.full_name || "Клиент не указан"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InTreatmentPage;
