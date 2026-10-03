import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { sendPublicLead } from "@/lib/crm-api";

const CTA: Record<string, { label: string; title: string; text: string; points: string[]; button: string; topic: string; dark?: boolean }> = {
  urgent: {
    label: "Срочная помощь 24/7",
    title: "Нужен врач прямо сейчас? Приедем за 40–60 минут",
    text: "Нарколог приедет анонимно, на машине без опознавательных знаков. Осмотр и капельница — дома, без постановки на учёт.",
    points: ["Круглосуточно, без выходных", "Бесплатная консультация по телефону", "Без документов и огласки"],
    button: "Вызвать врача",
    topic: "Срочный вызов врача (статья)",
  },
  consult: {
    label: "Бесплатная консультация",
    title: "Узнайте, какое лечение подойдёт именно вам",
    text: "Врач ответит на вопросы, оценит ситуацию и предложит план. Это ни к чему не обязывает и полностью анонимно.",
    points: ["Ответим в течение 5 минут", "Можно под псевдонимом", "Без постановки на учёт"],
    button: "Получить консультацию",
    topic: "Консультация (статья)",
  },
  family: {
    label: "Помощь родственникам",
    title: "Близкий не хочет лечиться? Начните с консультации для себя",
    text: "Психолог бесплатно поможет разобраться в ситуации, подготовить разговор и мотивировать близкого начать лечение.",
    points: ["Бесплатно для родственников", "Подскажем, что говорить и чего не делать", "Анонимно — близкий не узнает о звонке"],
    button: "Записаться на консультацию",
    topic: "Консультация для родственников (статья)",
  },
  crisis: {
    label: "Кризисная линия 24/7",
    title: "Тяжело прямо сейчас? Психолог на связи круглосуточно",
    text: "Можно позвонить или оставить контакт — специалист свяжется в течение нескольких минут. Без осуждения и анонимно.",
    points: ["Психолог отвечает в любое время", "Бесплатно и конфиденциально", "При необходимости — консультация психиатра"],
    button: "Связаться с психологом",
    topic: "Кризисная помощь (статья)",
    dark: true,
  },
  premium: {
    label: "PREMIUM",
    title: "Лечение, о котором не узнает никто",
    text: "Закрытая программа с абсолютной анонимностью, врачами с мировым именем и проживанием в частной резиденции.",
    points: ["Гарантия конфиденциальности в договоре", "Личный куратор 24/7", "Люксы в сосновом лесу"],
    button: "Узнать о программе",
    topic: "PREMIUM (статья)",
    dark: true,
  },
};

const ArticleCta = ({ type, source, compact = false }: { type: string; source: string; compact?: boolean }) => {
  const c = CTA[type] || CTA.consult;
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (contact.replace(/\D/g, "").length < 10 && !contact.includes("@")) { setState("error"); return; }
    setState("sending");
    try {
      await sendPublicLead({ contact, topic: c.topic, message: `Со страницы статьи: ${source}` });
      setState("sent");
    } catch {
      setState("error");
    }
  };

  const dark = c.dark || type === "urgent";

  if (compact) {
    return (
      <div className={`rounded-2xl p-5 ${dark ? "bg-ink text-ink-foreground" : "bg-primary text-primary-foreground"}`}>
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">{c.label}</p>
        <p className="mt-2 font-heading text-lg font-semibold leading-snug">{c.title}</p>
        <a href={PHONE_HREF} className={`mt-4 flex h-11 items-center justify-center gap-2 rounded-full font-medium ${dark ? "bg-primary text-primary-foreground" : "bg-white text-foreground"}`}>
          <Icon name="Phone" size={16} />{PHONE_DISPLAY}
        </a>
        <p className="mt-2 text-center text-xs opacity-70">Бесплатно и анонимно, 24/7</p>
      </div>
    );
  }

  return (
    <section className={`relative my-12 overflow-hidden rounded-3xl p-7 md:p-10 ${dark ? "bg-ink text-ink-foreground" : "bg-primary text-primary-foreground"}`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${dark ? "bg-primary text-primary-foreground" : "bg-white/15"}`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />{c.label}
          </p>
          <h2 className="mt-4 font-heading text-[1.6em] font-semibold leading-tight tracking-[-0.03em]">{c.title}</h2>
          <p className="mt-3 opacity-80">{c.text}</p>
          <ul className="mt-5 space-y-2 text-[0.95em]">
            {c.points.map((p) => <li key={p} className="flex items-center gap-2"><Icon name="Check" size={16} />{p}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-5 text-foreground">
          {type === "premium" ? (
            <Link to="/premium" className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink font-medium text-ink-foreground">{c.button}<Icon name="ArrowRight" size={16} /></Link>
          ) : state === "sent" ? (
            <div className="py-4 text-center">
              <Icon name="CircleCheck" size={36} className="mx-auto text-emerald-600" />
              <p className="mt-3 font-heading font-semibold">Заявка принята</p>
              <p className="mt-1 text-sm text-muted-foreground">Специалист свяжется с вами в ближайшие минуты</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <a href={PHONE_HREF} className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground">
                <Icon name="Phone" size={16} />{PHONE_DISPLAY}
              </a>
              <p className="text-center text-xs text-muted-foreground">или оставьте контакт — перезвоним</p>
              <input
                value={contact}
                onChange={(e) => { setContact(e.target.value); if (state === "error") setState("idle"); }}
                placeholder="Телефон или Telegram"
                className={`h-11 rounded-full border bg-background px-4 text-[0.95em] outline-none focus:border-foreground/40 ${state === "error" ? "border-primary" : ""}`}
              />
              <button type="submit" disabled={state === "sending"} className="h-11 rounded-full bg-ink font-medium text-ink-foreground disabled:opacity-60">
                {state === "sending" ? "Отправляем…" : c.button}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><Icon name="Lock" size={11} />Анонимно, без постановки на учёт</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ArticleCta;
