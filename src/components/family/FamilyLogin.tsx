import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOGO_URL, PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { familyApi, RELATIONS } from "@/lib/family-api";
import { useFamilyAuth } from "./FamilyAuth";
import ConsentCheckbox from "@/components/legal/ConsentCheckbox";
import { reachGoal } from "@/lib/goals";

const IMG = "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/835def65-2d36-46aa-a64d-01df6f28c38f.jpg";

const FEATURES = [
  { icon: "MessageCircleQuestion", title: "Вопрос психологу", text: "Письменный ответ специалиста клиники" },
  { icon: "CalendarHeart", title: "Встречи и вебинары", text: "Группы поддержки и эфиры с врачами" },
  { icon: "Sparkles", title: "ИИ-психолог 24/7", text: "Тренажёр разговора, письма, план действий" },
];

const FamilyLogin = () => {
  const { signIn } = useFamilyAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", relation: "spouse" });
  const [agree, setAgree] = useState(false);
  const [offer, setOffer] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "register" && (!agree || !offer)) { setError("Примите оферту и дайте согласие на обработку персональных данных"); return; }
    setBusy(true);
    try {
      const r = mode === "login" ? await familyApi.login({ email: form.email, password: form.password }) : await familyApi.register({ ...form, consent: agree, offer });
      reachGoal(mode === "login" ? "family_login" : "family_register");
      await signIn(r.token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/10" />
        <div className="relative flex h-full flex-col justify-between p-12 text-ink-foreground">
          <Link to="/" className="w-fit rounded-full bg-white/90 px-4 py-2"><img src={LOGO_URL} alt="addict.clinic" className="h-5" /></Link>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"><Icon name="HeartHandshake" size={13} />Кабинет для близких</p>
            <h1 className="mt-5 max-w-[520px] font-heading text-[2.8em] font-medium leading-[1.05] tracking-[-0.04em]">Вы не обязаны справляться в одиночку.</h1>
            <p className="mt-4 max-w-[460px] text-white/75">Пространство поддержки для родственников зависимых: специалисты клиники, группы и ИИ-психолог, который всегда на связи. Первые 3 дня — полный доступ бесплатно.</p>
            <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <Icon name={f.icon} size={20} className="text-white" />
                  <p className="mt-3 text-sm font-semibold">{f.title}</p>
                  <p className="mt-1 text-xs text-white/65">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-5 py-8 md:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden"><img src={LOGO_URL} alt="addict.clinic" className="h-5" /></Link>
          <a href={PHONE_HREF} className="inline-flex items-center gap-2 text-sm font-medium"><Icon name="Phone" size={14} className="text-primary" />{PHONE_DISPLAY}</a>
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium lg:hidden"><Icon name="HeartHandshake" size={13} className="text-primary" />Кабинет для близких</p>
          <h2 className="mt-4 font-heading text-[2em] font-semibold tracking-[-0.03em] lg:mt-0">{mode === "register" ? "Создать кабинет" : "Вход в кабинет"}</h2>
          <p className="mt-2 text-muted-foreground">{mode === "register" ? "3 дня полного доступа бесплатно. Конфиденциально — можно указать псевдоним." : "Рады видеть вас снова."}</p>

          <div className="mt-6 grid grid-cols-2 rounded-full bg-secondary p-1">
            {(["register", "login"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} className={`rounded-full py-2 text-sm font-medium transition-colors ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                {m === "register" ? "Регистрация" : "Вход"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            {mode === "register" && (
              <>
                <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Как к вам обращаться" className="h-12 bg-card" required />
                <Select value={form.relation} onValueChange={set("relation")}>
                  <SelectTrigger className="h-12 bg-card"><SelectValue placeholder="Кем вы приходитесь" /></SelectTrigger>
                  <SelectContent>{Object.entries(RELATIONS).map(([k, l]) => <SelectItem key={k} value={k}>Я — {l.toLowerCase()} зависимого</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="Email" className="h-12 bg-card" required />
            <Input type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} placeholder={mode === "register" ? "Пароль (от 6 символов)" : "Пароль"} className="h-12 bg-card" required />
            {mode === "register" && (
              <>
                <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="Телефон (необязательно)" className="h-12 bg-card" />
                <ConsentCheckbox kind="offer" checked={offer} onChange={(v) => { setOffer(v); setError(""); }} />
                <ConsentCheckbox checked={agree} onChange={(v) => { setAgree(v); setError(""); }} />
              </>
            )}
            {error && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{error}</p>}
            <button type="submit" disabled={busy} className="accent-glow mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground disabled:opacity-60">
              {busy && <Icon name="Loader2" size={16} className="animate-spin" />}
              {mode === "register" ? "Создать кабинет" : "Войти"}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground">
            <Icon name="ShieldCheck" size={20} className="shrink-0 text-primary" />
            Мы не сообщаем вашему близкому о регистрации и не передаём данные посторонним.
          </div>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground">Политика конфиденциальности</a>
            <a href="/offer" className="hover:text-foreground">Оферта</a>
            <a href="/requisites" className="hover:text-foreground">Реквизиты</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FamilyLogin;
