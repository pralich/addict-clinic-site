import { useState, type FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import ConsentCheckbox from "@/components/legal/ConsentCheckbox";
import { sendPublicLead } from "@/lib/crm-api";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";

const TreatmentLeadForm = ({ topic, form }: { topic: string; form: string }) => {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [forWhom, setForWhom] = useState<"self" | "close">("self");
  const [consent, setConsent] = useState(false);
  const [consentErr, setConsentErr] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (contact.replace(/\D/g, "").length < 10 && !contact.includes("@")) return setError("Укажите телефон или мессенджер");
    if (!consent) {
      setConsentErr(true);
      return setError("Отметьте согласие на обработку данных");
    }
    setError("");
    setSending(true);
    try {
      await sendPublicLead({ name, contact, topic, consent, form, message: forWhom === "close" ? "Обращение для близкого" : "" });
      setSent(true);
    } catch {
      setError(`Не удалось отправить. Позвоните: ${PHONE_DISPLAY}`);
    } finally {
      setSending(false);
    }
  };

  if (sent)
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-live/15 text-live"><Icon name="Check" size={26} /></span>
        <p className="mt-4 font-heading text-xl font-medium">Заявка принята</p>
        <p className="mt-1 max-w-[300px] text-sm text-muted-foreground">Врач перезвонит в течение 5 минут. Если срочно — <a href={PHONE_HREF} className="text-primary">позвоните</a>.</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-sm">
        {([["self", "Для себя"], ["close", "Для близкого"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setForWhom(k)} className={`rounded-full py-2 ${forWhom === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя или псевдоним (необязательно)" className="h-11 bg-background" />
      <Input value={contact} onChange={(e) => { setContact(e.target.value); setError(""); }} placeholder="Телефон или мессенджер" inputMode="tel" className={`h-11 bg-background ${error && !consentErr ? "border-primary" : ""}`} />
      <ConsentCheckbox checked={consent} error={consentErr} onChange={(v) => { setConsent(v); setConsentErr(false); if (v) setError(""); }} />
      {error && <p className="text-sm text-primary">{error}</p>}
      <button disabled={sending} className="accent-glow inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70">
        <Icon name={sending ? "Loader2" : "Lock"} size={16} className={sending ? "animate-spin" : ""} />
        {sending ? "Отправляем…" : "Получить консультацию"}
      </button>
      <p className="text-center text-xs text-muted-foreground">Бесплатно и анонимно · перезвоним за 5 минут</p>
    </form>
  );
};

export default TreatmentLeadForm;
