import { useEffect, useState } from "react";
import { useSearchParams } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LOGO_URL } from "@/components/clinic/contacts";
import PartnerLogin from "@/components/partner/PartnerLogin";
import PartnerLeads from "@/components/partner/PartnerLeads";
import PartnerDeals from "@/components/partner/PartnerDeals";
import PartnerPatients from "@/components/partner/PartnerPatients";
import { getPartnerToken, partnerApi, setPartnerToken, type PartnerUser } from "@/lib/partner-api";
import type { Seo } from "@/lib/seo";

const NAV = [
  { id: "home", label: "Обзор", icon: "LayoutDashboard" },
  { id: "patients", label: "Пациенты", icon: "BedDouble" },
  { id: "deals", label: "Сделки", icon: "Handshake" },
  { id: "leads", label: "Лиды", icon: "Inbox" },
] as const;

const Overview = ({ go }: { go: (s: string) => void }) => {
  const { data } = useQuery({ queryKey: ["partner", "overview"], queryFn: partnerApi.overview, refetchInterval: 60000 });
  const cards = [
    { icon: "BedDouble", l: "На лечении", v: data?.in_treatment, s: "patients" },
    { icon: "CalendarClock", l: "Ожидаются", v: data?.expected, s: "patients" },
    { icon: "Handshake", l: "Сделки ждут приёма", v: data?.deals_waiting, s: "deals", warn: true },
    { icon: "Inbox", l: "Новые лиды", v: data?.leads_new, s: "leads", warn: true },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button key={c.l} onClick={() => go(c.s)} className={`flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left hover:border-primary/40 ${c.warn && Number(c.v) > 0 ? "border-amber-300" : ""}`}>
            <Icon name={c.icon} size={20} className="text-primary" />
            <p className="font-heading text-2xl font-semibold">{c.v ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{c.l}</p>
          </button>
        ))}
      </div>
      {Number(data?.no_report_today) > 0 && (
        <button onClick={() => go("patients")} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-amber-100 p-4 text-left text-amber-900">
          <Icon name="NotebookPen" size={20} />
          <span className="text-sm"><b>{data!.no_report_today}</b> пац. без записи в дневнике за последние сутки — добавьте отчёт о состоянии</span>
        </button>
      )}
      <div className="mt-6 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Как работать с кабинетом</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>В «Лидах» и «Сделках» — только обращения, которые клиника передала вашей организации.</li>
          <li>Когда пациент приезжает, откройте сделку и нажмите «Принять пациента на лечение».</li>
          <li>Ежедневно добавляйте запись в дневник лечения — менеджер клиники видит её сразу.</li>
          <li>При выписке смените статус пациента на «Выписан» и укажите дату.</li>
        </ul>
      </div>
    </div>
  );
};

const PasswordDialog = ({ onClose }: { onClose: () => void }) => {
  const [old, setOld] = useState("");
  const [next, setNext] = useState("");
  const save = async () => {
    try {
      await partnerApi.password(old, next);
      toast.success("Пароль изменён");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Сменить пароль</DialogTitle></DialogHeader>
        <Input type="password" value={old} onChange={(e) => setOld(e.target.value)} placeholder="Текущий пароль" />
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Новый пароль (от 6 символов)" />
        <button onClick={save} className="rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Сохранить</button>
      </DialogContent>
    </Dialog>
  );
};

export const SEO: Seo = { title: "Кабинет партнёра — addict.clinic", description: "Кабинет клиник-партнёров addict.clinic", path: "/partner", noindex: true };

const Partner = () => {
  const [user, setUser] = useState<PartnerUser | null>(null);
  const [loading, setLoading] = useState(!!getPartnerToken());
  const [params, setParams] = useSearchParams();
  const [pwd, setPwd] = useState(false);
  const section = NAV.some((n) => n.id === params.get("s")) ? params.get("s")! : "home";

  useEffect(() => {
    if (getPartnerToken()) partnerApi.me().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
    const out = () => setUser(null);
    window.addEventListener("partner-logout", out);
    return () => window.removeEventListener("partner-logout", out);
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  if (!user) return <PartnerLogin onLogin={setUser} />;

  const go = (s: string) => { setParams(s === "home" ? {} : { s }); window.scrollTo(0, 0); };
  const logout = async () => {
    await partnerApi.logout().catch(() => null);
    setPartnerToken(null);
    setUser(null);
  };
  const current = NAV.find((n) => n.id === section)!;

  return (
    <div className="min-h-screen bg-secondary/30 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <img src={LOGO_URL} alt="addict.clinic" className="h-4" />
          <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:flex"><Icon name="Handshake" size={12} />Партнёр</span>
          <nav className="ml-4 hidden gap-1 md:flex">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${section === n.id ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon name={n.icon} size={15} />{n.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-xs leading-tight sm:block"><p className="font-medium">{user.partner_name}</p><p className="text-muted-foreground">{user.name}</p></div>
            <button onClick={() => setPwd(true)} title="Сменить пароль" className="rounded-full p-2 hover:bg-secondary"><Icon name="KeyRound" size={17} /></button>
            <button onClick={logout} title="Выйти" className="rounded-full p-2 hover:bg-secondary"><Icon name="LogOut" size={17} /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 font-heading text-2xl font-semibold tracking-tight">{section === "home" ? user.partner_name : current.label}</h1>
        {section === "home" && <Overview go={go} />}
        {section === "patients" && <PartnerPatients />}
        {section === "deals" && <PartnerDeals />}
        {section === "leads" && <PartnerLeads />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-background md:hidden">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => go(n.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${section === n.id ? "text-primary" : "text-muted-foreground"}`}>
            <Icon name={n.icon} size={20} />{n.label}
          </button>
        ))}
      </nav>
      {pwd && <PasswordDialog onClose={() => setPwd(false)} />}
    </div>
  );
};

export default Partner;