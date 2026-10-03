import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { useAuth, type CrmUser } from "./AuthContext";

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [setup, setSetup] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ needsSetup: boolean }>({ resource: "auth", action: "status" })
      .then((r) => setSetup(r.needsSetup))
      .catch(() => setSetup(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api<{ token: string; user: CrmUser }>(
        { resource: "auth", action: setup ? "setup" : "login" },
        "POST",
        setup ? { name, email, password } : { email, password },
      );
      signIn(r.token, r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-[400px] rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon name="Cross" size={20} />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold leading-tight">addict.clinic</p>
            <p className="text-xs text-muted-foreground">Панель управления</p>
          </div>
        </div>
        {setup === null ? (
          <div className="flex justify-center py-8"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <h1 className="font-heading text-xl font-semibold">{setup ? "Создание администратора" : "Вход"}</h1>
              {setup && <p className="mt-1 text-sm text-muted-foreground">Это первый вход. Создайте главную учётную запись.</p>}
            </div>
            {setup && (
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Имя</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Email</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Пароль</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={setup ? "new-password" : "current-password"} />
            </label>
            {error && <p className="text-sm text-primary">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 rounded-full">
              {busy && <Icon name="Loader2" size={16} className="mr-2 animate-spin" />}
              {setup ? "Создать и войти" : "Войти"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
