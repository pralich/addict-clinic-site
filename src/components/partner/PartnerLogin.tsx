import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { LOGO_URL } from "@/components/clinic/contacts";
import { partnerApi, setPartnerToken, type PartnerUser } from "@/lib/partner-api";

const PartnerLogin = ({ onLogin }: { onLogin: (u: PartnerUser) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await partnerApi.login(email, password);
      setPartnerToken(r.token);
      onLogin(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm">
        <img src={LOGO_URL} alt="addict.clinic" className="h-5" />
        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Icon name="Handshake" size={13} />Кабинет партнёра</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight">Вход для клиник-партнёров</h1>
        <p className="mt-1 text-sm text-muted-foreground">Доступ выдаёт менеджер addict.clinic</p>
        <div className="mt-6 flex flex-col gap-3">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-11" required autoComplete="username" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="h-11" required autoComplete="current-password" />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy && <Icon name="Loader2" size={16} className="animate-spin" />}Войти
          </button>
        </div>
      </form>
    </div>
  );
};

export default PartnerLogin;
