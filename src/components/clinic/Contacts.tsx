import { useState, type FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import Cross3D from "./Cross3D";
import { PHONE_DISPLAY, PHONE_HREF } from "./contacts";
import { sendPublicLead } from "@/lib/crm-api";
import ConsentCheckbox from "@/components/legal/ConsentCheckbox";

const TOPICS = ["Алкоголь", "Наркотики", "Лекарства", "Игромания", "Для близкого", "Другое"];

const Contacts = () => {
  const { toast } = useToast();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentErr, setConsentErr] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const [sending, setSending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = contact.replace(/\D/g, "");
    if (digits.length < 10 && !contact.includes("@")) {
      setError("Укажите телефон или мессенджер, чтобы мы могли связаться");
      return;
    }
    if (!consent) {
      setConsentErr(true);
      setError("Отметьте согласие на обработку персональных данных");
      return;
    }
    setError("");
    setSending(true);
    try {
      await sendPublicLead({ name, contact, topic, message: msg, consent, form: "contacts" });
      setSent(true);
      toast({ title: "Заявка принята", description: "Специалист свяжется с вами в течение 5 минут." });
    } catch {
      setError(`Не удалось отправить. Позвоните нам: ${PHONE_DISPLAY}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contacts" className="scroll-mt-16 bg-night py-20 text-night-foreground md:py-28">
      <div className="mx-auto max-w-[1280px] px-5 md:px-16">
        <SectionHead
          dark
          label="Контакты"
          title={<>Анонимная заявка.<br className="hidden md:block" /> Перезвоним за 5 минут.</>}
          text="Имя можно не указывать. Данные не сохраняются после консультации и не передаются третьим лицам."
        />

        <div className="grid gap-[7px] lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="flex flex-col gap-[7px]">
            <a
              href={PHONE_HREF}
              className="group relative overflow-hidden rounded-[10px] bg-primary p-6 text-primary-foreground accent-glow md:p-8"
            >
              <p className="flex items-center gap-2 text-[0.9em] opacity-80">
                <i className="live-dot block h-2 w-2 rounded-full bg-live" />
                Срочная помощь · круглосуточно
              </p>
              <p className="mt-5 font-heading text-[clamp(28px,3.6vw,40px)] font-medium tracking-[-0.04em]">{PHONE_DISPLAY}</p>
              <p className="mt-2 opacity-80">Бесплатно по России</p>
              <Icon name="ArrowUpRight" size={28} className="absolute right-6 top-6 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
            <div className="grid flex-1 gap-[7px] sm:grid-cols-2">
              <div className="rounded-[10px] bg-night-foreground/[0.06] p-5">
                <Icon name="MapPin" size={20} className="text-primary" />
                <p className="mt-6 font-heading font-semibold tracking-tight">Москва</p>
                <p className="mt-1 text-[0.93em] text-night-muted">Клиника и стационар, отдельный вход без вывески</p>
              </div>
              <div className="rounded-[10px] bg-night-foreground/[0.06] p-5">
                <Icon name="Clock" size={20} className="text-primary" />
                <p className="mt-6 font-heading font-semibold tracking-tight">24/7</p>
                <p className="mt-1 text-[0.93em] text-night-muted">Выезд врача по Москве и области без выходных</p>
              </div>
            </div>
            <div className="relative hidden h-[150px] items-center justify-center overflow-hidden rounded-[10px] bg-night-foreground/[0.06] lg:flex">
              <Cross3D size={80} className="mt-6" />
            </div>
          </Reveal>

          <Reveal delay={120} className="rounded-[10px] bg-card p-6 text-card-foreground md:p-8">
            {sent ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center animate-scale-in">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-a text-teal-foreground">
                  <Icon name="Check" size={28} />
                </span>
                <h3 className="mt-6 font-heading text-[1.8em] font-medium tracking-[-0.04em]">Заявка принята</h3>
                <p className="mt-2 max-w-[340px] text-muted-foreground">
                  Специалист свяжется с вами в течение 5 минут. Если ситуация срочная — звоните прямо сейчас.
                </p>
                <button onClick={() => { setSent(false); setContact(""); setName(""); setMsg(""); }} className="mt-6 text-[0.95em] font-medium text-primary story-link">
                  Отправить ещё одну
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <div>
                  <p className="mb-2.5 text-[0.9em] font-medium">С чем нужна помощь</p>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTopic(t)}
                        className={`rounded-full px-3.5 py-2 text-[0.9em] transition-colors ${
                          topic === t ? "bg-ink text-ink-foreground" : "bg-secondary hover:bg-border"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[0.9em] font-medium">Как к вам обращаться <span className="text-muted-foreground">(необязательно)</span></span>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Можно псевдоним" className="h-11 bg-background" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[0.9em] font-medium">Телефон или мессенджер</span>
                    <Input
                      value={contact}
                      onChange={(e) => { setContact(e.target.value); if (error) setError(""); }}
                      placeholder="+7 900 000-00-00"
                      inputMode="tel"
                      className={`h-11 bg-background ${error ? "border-primary" : ""}`}
                      aria-invalid={!!error}
                    />
                  </label>
                </div>
                {error && <p className="-mt-2 text-[0.88em] text-primary">{error}</p>}
                <label className="block">
                  <span className="mb-2 block text-[0.9em] font-medium">Комментарий <span className="text-muted-foreground">(необязательно)</span></span>
                  <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Опишите ситуацию в двух словах" className="bg-background" />
                </label>
                <ConsentCheckbox checked={consent} error={consentErr} onChange={(v) => { setConsent(v); setConsentErr(false); if (v) setError(""); }} />
                <button
                  type="submit"
                  disabled={sending}
                  className="accent-glow inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                >
                  <Icon name={sending ? "Loader2" : "Lock"} size={16} className={sending ? "animate-spin" : ""} />
                  {sending ? "Отправляем…" : "Отправить анонимно"}
                </button>
                <p className="flex items-start gap-2 text-[0.82em] text-muted-foreground">
                  <Icon name="ShieldCheck" size={14} className="mt-0.5 shrink-0 text-teal-a" />
                  Мы не просим паспортные данные и не ставим на учёт. Разговор остаётся между вами и врачом.
                </p>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Contacts;