import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "../AuthContext";
import DealsIncome from "./DealsIncome";
import Operations from "./Operations";
import Cashflow from "./Cashflow";
import Billing from "./Billing";
import Counterparties from "./Counterparties";

const TABS = [
  { id: "billing", label: "Счета и платежи", icon: "FileText" },
  { id: "counterparties", label: "Контрагенты", icon: "Briefcase" },
  { id: "deals", label: "Доходы по сделкам", icon: "Handshake" },
  { id: "ops", label: "Расходы предприятия", icon: "Receipt" },
  { id: "cashflow", label: "Cashflow", icon: "ChartColumnBig" },
];

const FinancePage = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState("billing");

  if (user?.role !== "admin") {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <Icon name="Lock" size={24} />
        Раздел «Финансы» доступен только администратору
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Финансы</h1>
        <p className="text-sm text-muted-foreground">Счета, платежи, выручка по сделкам, расходы и движение денег</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm ${tab === t.id ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon name={t.icon} fallback="BarChart3" size={15} />{t.label}
          </button>
        ))}
      </div>
      {tab === "billing" && <Billing onOpen={onOpen} />}
      {tab === "counterparties" && <Counterparties />}
      {tab === "deals" && <DealsIncome onOpen={onOpen} />}
      {tab === "ops" && <Operations />}
      {tab === "cashflow" && <Cashflow />}
    </div>
  );
};

export default FinancePage;
