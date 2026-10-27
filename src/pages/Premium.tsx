import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import Reveal from "@/components/clinic/Reveal";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { sendPublicLead } from "@/lib/crm-api";
import ConsentCheckbox from "@/components/legal/ConsentCheckbox";
import { LEGAL_LINKS, ORG } from "@/lib/legal";
import { SITE_URL, type SeoInput } from "@/lib/seo";
import { CLINIC_ID, clinicNode, graph, logoNode, websiteNode, webPage } from "@/lib/schema";

const PREMIUM_LD = graph(
  clinicNode,
  logoNode,
  websiteNode,
  webPage({
    type: ["MedicalWebPage", "WebPage"],
    path: "/premium",
    name: "addict.clinic PREMIUM — VIP-лечение зависимостей",
    description: "Анонимное стационарное лечение зависимостей в условиях резиденции: персональная команда врачей, отдельное размещение, полная конфиденциальность.",
    crumbs: [["PREMIUM", "/premium"]],
    extra: { mainEntity: { "@id": `${SITE_URL}/premium#service` } },
  }),
  {
    "@type": ["Service", "MedicalTherapy"],
    "@id": `${SITE_URL}/premium#service`,
    name: "addict.clinic PREMIUM",
    serviceType: "Анонимное стационарное лечение зависимостей в условиях резиденции",
    description: "VIP-программа лечения зависимостей: персональная команда врачей, отдельное размещение, полная конфиденциальность.",
    provider: { "@id": CLINIC_ID },
    areaServed: [{ "@type": "City", name: "Москва" }, { "@type": "AdministrativeArea", name: "Московская область" }],
    audience: { "@type": "PeopleAudience", audienceType: "Люди с зависимостями и их близкие" },
    relevantSpecialty: "Psychiatric",
    url: `${SITE_URL}/premium`,
  },
);

const IMG_SUITE = "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/424c1c3f-702f-42ed-b676-2530ceff3686.jpg";
const IMG_DOCTOR = "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/931c2f44-73a7-4db8-8948-042009851630.jpg";
const IMG_RESIDENCE = "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/a6e706dd-0c38-4028-a514-475ab25b15bc.jpg";

const GOLD = "text-[#d9c4a1]";

const PRIVACY = [
  { icon: "UserX", title: "Без имени и документов", text: "Вы можете пройти весь курс под псевдонимом. Паспорт, полис и СНИЛС мы не запрашиваем." },
  { icon: "FileLock2", title: "Никаких записей в базах", text: "Мы не ставим на учёт и не передаём сведения в государственные системы, работодателям или родственникам." },
  { icon: "FileSignature", title: "Соглашение о неразглашении", text: "Индивидуальное NDA с клиникой и с каждым специалистом, который работает с вами. С финансовой ответственностью." },
  { icon: "Car", title: "Незаметный приезд", text: "Трансфер на автомобиле без опознавательных знаков, отдельный вход и маршрут без встреч с другими пациентами." },
  { icon: "ShieldCheck", title: "Закрытая медкарта", text: "Документы хранятся в зашифрованном виде, доступ только у лечащего врача. По окончании курса их можно уничтожить." },
  { icon: "PhoneOff", title: "Цифровая тишина", text: "Защищённая связь с семьёй по вашему желанию, запрет съёмки на территории, персонал подписывает обязательства." },
];

const EXPERTS = [
  { name: "Профессор, д.м.н.", role: "Психиатр-нарколог, руководитель программы", text: "Более 30 лет практики, стажировки в клиниках Швейцарии и Великобритании, автор научных работ по лечению зависимостей." },
  { name: "Д.м.н.", role: "Психотерапевт, специалист по когнитивно-поведенческой терапии", text: "Член международных профессиональных ассоциаций, преподаёт и ведёт супервизии для врачей." },
  { name: "К.м.н.", role: "Анестезиолог-реаниматолог", text: "Детоксикация под наблюдением врача, который отвечает за безопасность каждой процедуры 24 часа в сутки." },
];

const COMFORT = [
  { icon: "BedDouble", title: "Личный люкс", text: "Апартаменты площадью от 45 м² с гостиной, ванной комнатой и видом на сосновый лес." },
  { icon: "ChefHat", title: "Шеф-повар и диетолог", text: "Меню составляют под ваше состояние и вкусы. Можно заказать в любое время." },
  { icon: "Waves", title: "SPA и восстановление", text: "Бассейн, хаммам, массаж, остеопатия и тренировки с персональным инструктором." },
  { icon: "Headset", title: "Личный куратор", text: "Один человек решает все вопросы: от расписания процедур до связи с семьёй." },
  { icon: "Laptop", title: "Рабочий кабинет", text: "Защищённый интернет и тихое место, если нужно оставаться на связи по делам." },
  { icon: "Plane", title: "Трансфер и выезд", text: "Встретим в аэропорту или приедем к вам. Возможен выезд бригады в другой город." },
];

const NUMBERS = [
  { value: "1:4", label: "один пациент на четырёх специалистов" },
  { value: "8", label: "люксов на всю резиденцию" },
  { value: "24/7", label: "врач и куратор рядом" },
  { value: "0", label: "утечек данных за всё время работы" },
];

const PremiumHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled ? "border-b border-white/10 bg-[#0e0e10]/85 backdrop-blur-md" : ""}`}>
      <div className="mx-auto flex h-16 max-w-site items-center justify-between px-5 md:px-14">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">
          <Icon name="ArrowLeft" size={16} />
          <span className="hidden sm:inline">Основной сайт</span>
        </Link>
        <img src="/logo-premium-mark.png" alt="addict.clinic PREMIUM" className="h-8 w-auto" />
        <a href={PHONE_HREF} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#d9c4a1]/40 px-4 text-sm text-[#e8dcc6] transition-colors hover:bg-white/5">
          <Icon name="Phone" size={14} />
          <span className="hidden sm:inline">{PHONE_DISPLAY}</span>
        </a>
      </div>
    </header>
  );
};

const Label = ({ children }: { children: string }) => (
  <p className={`mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] ${GOLD}`}>
    <span className="h-px w-8 bg-[#d9c4a1]/50" />
    {children}
  </p>
);

const PremiumForm = () => {
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (contact.replace(/\D/g, "").length < 10 && !contact.includes("@")) {
      setError("Укажите телефон, мессенджер или email");
      return;
    }
    if (!consent) {
      setError("Отметьте согласие на обработку персональных данных");
      return;
    }
    setError("");
    setSending(true);
    try {
      await sendPublicLead({ name, contact, topic: "PREMIUM", message: msg, consent, form: "premium" });
      setSent(true);
    } catch {
      setError(`Не удалось отправить. Позвоните: ${PHONE_DISPLAY}`);
    } finally {
      setSending(false);
    }
  };

  const field = "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#d9c4a1]/60";

  if (sent) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d9c4a1]/40">
          <Icon name="Check" size={24} className={GOLD} />
        </div>
        <p className="mt-5 font-heading text-2xl text-white">Запрос получен</p>
        <p className="mt-2 max-w-[320px] text-white/60">Личный куратор свяжется с вами в течение 15 минут удобным вам способом.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться (можно псевдоним)" className={field} />
      <input value={contact} onChange={(e) => { setContact(e.target.value); setError(""); }} placeholder="Телефон, Telegram или email" className={field} />
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="Удобное время и способ связи (необязательно)"
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#d9c4a1]/60" />
      <ConsentCheckbox tone="dark" checked={consent} onChange={(v) => { setConsent(v); setError(""); }} />
      {error && <p className="text-sm text-[#ff7b7f]">{error}</p>}
      <button type="submit" disabled={sending}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c9b190] via-[#f1e3c8] to-[#b8a284] font-medium text-[#15130f] transition-transform hover:-translate-y-0.5 disabled:opacity-70">
        <Icon name={sending ? "Loader2" : "Lock"} size={16} className={sending ? "animate-spin" : ""} />
        {sending ? "Отправляем…" : "Запросить персональную консультацию"}
      </button>
      <p className="flex items-start gap-2 text-xs text-white/45">
        <Icon name="ShieldCheck" size={14} className={`mt-0.5 shrink-0 ${GOLD}`} />
        Данные видит только ваш куратор. Мы не перезваниваем с узнаваемых номеров и не оставляем сообщений третьим лицам.
      </p>
    </form>
  );
};

export const SEO: SeoInput = {
  title: "VIP-лечение зависимостей анонимно — addict.clinic PREMIUM",
  description: "Премиальная программа лечения зависимостей: абсолютная анонимность с гарантией в договоре, врачи с мировым именем, частная резиденция с люксами, SPA и личным куратором.",
  path: "/premium",
  image: "/og-premium.jpg",
  jsonLd: PREMIUM_LD,
};

const Premium = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0e0e10] text-[#e8e6e1]">
      <PremiumHeader />

      <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-16">
        <img src={IMG_RESIDENCE} alt="Частная резиденция addict.clinic PREMIUM в сосновом лесу" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e10]/70 via-[#0e0e10]/60 to-[#0e0e10]" />
        <div className="premium-glow absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2" />
        <div className="relative mx-auto w-full max-w-site px-5 py-16 text-center md:px-14">
          <Reveal>
            <img src="/logo-premium.png" alt="addict.clinic PREMIUM" className="mx-auto w-[240px] md:w-[320px]" />
          </Reveal>
          <Reveal delay={120}>
            <h1 className="mx-auto mt-10 max-w-[900px] font-heading text-[2.2rem] font-medium leading-[1.08] tracking-[-0.03em] text-white md:text-[3.6rem]">
              Лечение зависимости, о котором <span className="premium-gold-text">не узнает никто</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mx-auto mt-6 max-w-[620px] text-[1.05rem] leading-relaxed text-white/65">
              Закрытая программа для тех, кому важны абсолютная конфиденциальность, врачи с мировым именем и условия загородной резиденции.
            </p>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#request" className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#c9b190] via-[#f1e3c8] to-[#b8a284] px-7 font-medium text-[#15130f] transition-transform hover:-translate-y-0.5">
                Персональная консультация
                <Icon name="ArrowRight" size={16} />
              </a>
              <a href={PHONE_HREF} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-7 text-white transition-colors hover:bg-white/5">
                <Icon name="Phone" size={16} />
                {PHONE_DISPLAY}
              </a>
            </div>
          </Reveal>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
          <Icon name="ChevronDown" size={22} />
        </div>
      </section>

      <section className="border-y border-white/10">
        <div className="mx-auto grid max-w-site grid-cols-2 px-5 md:grid-cols-4 md:px-14">
          {NUMBERS.map((n, i) => (
            <Reveal key={n.label} delay={i * 80} className={`py-10 md:px-6 ${i % 2 ? "pl-5" : ""} ${i > 0 ? "md:border-l md:border-white/10" : ""}`}>
              <p className="premium-gold-text font-heading text-4xl font-medium tracking-tight md:text-5xl">{n.value}</p>
              <p className="mt-2 text-sm text-white/55">{n.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="privacy" className="mx-auto max-w-site px-5 py-24 md:px-14 md:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <Label>Конфиденциальность</Label>
            <h2 className="font-heading text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-white md:text-[2.8rem]">
              Абсолютная анонимность — главное условие программы
            </h2>
            <p className="mt-6 max-w-[460px] leading-relaxed text-white/60">
              Мы работаем с предпринимателями, публичными людьми и их семьями. Поэтому защищаем не только медицинскую тайну, но и сам факт вашего обращения.
            </p>
            <div className="premium-card mt-8 flex items-start gap-4 rounded-2xl p-5">
              <Icon name="Award" size={28} className={`shrink-0 ${GOLD}`} />
              <p className="text-sm leading-relaxed text-white/75">
                <span className="font-medium text-white">Гарантия, закреплённая в договоре.</span> Если сведения о вашем лечении станут известны третьим лицам по вине клиники, мы возвращаем полную стоимость программы и выплачиваем компенсацию.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRIVACY.map((p, i) => (
              <Reveal key={p.title} delay={i * 70} className="premium-card rounded-2xl p-6 transition-colors hover:border-[#d9c4a1]/35">
                <Icon name={p.icon} size={24} className={GOLD} />
                <p className="mt-5 font-heading text-lg font-medium text-white">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="experts" className="bg-[#141416] py-24 md:py-32">
        <div className="mx-auto max-w-site px-5 md:px-14">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="relative">
              <div className="premium-glow absolute -inset-10" />
              <img src={IMG_DOCTOR} alt="Руководитель программы PREMIUM, профессор психиатрии-наркологии" loading="lazy" className="relative aspect-[4/5] w-full rounded-3xl object-cover" />
              <div className="premium-card absolute bottom-5 left-5 right-5 rounded-2xl bg-[#0e0e10]/80 p-5 backdrop-blur-md">
                <p className={`text-xs uppercase tracking-[0.25em] ${GOLD}`}>Руководитель программы</p>
                <p className="mt-2 font-heading text-lg text-white">Профессор, доктор медицинских наук</p>
              </div>
            </Reveal>
            <div>
              <Reveal>
                <Label>Специалисты</Label>
                <h2 className="font-heading text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-white md:text-[2.8rem]">
                  Врачи высшего класса с мировым именем
                </h2>
                <p className="mt-6 leading-relaxed text-white/60">
                  С вами работает команда из ведущих наркологов, психиатров и психотерапевтов страны с международным опытом. Мы собираем консилиум под ваш случай и при необходимости приглашаем профессоров из европейских клиник.
                </p>
              </Reveal>
              <div className="mt-8 flex flex-col gap-3">
                {EXPERTS.map((e, i) => (
                  <Reveal key={e.role} delay={i * 80} className="premium-card rounded-2xl p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-heading font-medium text-white">{e.role}</p>
                      <span className={`text-xs ${GOLD}`}>{e.name}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{e.text}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="comfort" className="mx-auto max-w-site px-5 py-24 md:px-14 md:py-32">
        <Reveal className="max-w-[720px]">
          <Label>Стационар</Label>
          <h2 className="font-heading text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-white md:text-[2.8rem]">
            Максимальный комфорт и эксклюзивные условия
          </h2>
          <p className="mt-6 leading-relaxed text-white/60">
            Загородная резиденция всего на восемь гостей в сосновом лесу. Здесь нет общих палат и случайных встреч, только тишина, забота и ваш личный ритм восстановления.
          </p>
        </Reveal>
        <Reveal delay={100} className="relative mt-12 overflow-hidden rounded-3xl">
          <img src={IMG_SUITE} alt="Люкс в стационаре addict.clinic PREMIUM" loading="lazy" className="aspect-[16/9] w-full object-cover md:aspect-[21/9]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/80 via-transparent to-transparent" />
          <p className="absolute bottom-6 left-6 max-w-[420px] font-heading text-xl text-white md:bottom-8 md:left-8 md:text-2xl">
            Каждый люкс — отдельное пространство с собственным входом
          </p>
        </Reveal>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMFORT.map((c, i) => (
            <Reveal key={c.title} delay={i * 60} className="premium-card group rounded-2xl p-6 transition-colors hover:border-[#d9c4a1]/35">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9c4a1]/30 transition-colors group-hover:bg-[#d9c4a1]/10">
                <Icon name={c.icon} size={20} className={GOLD} />
              </div>
              <p className="mt-5 font-heading text-lg font-medium text-white">{c.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{c.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="request" className="relative overflow-hidden border-t border-white/10 bg-[#141416] py-24 md:py-32">
        <div className="premium-glow absolute -right-40 top-0 h-[600px] w-[600px]" />
        <div className="relative mx-auto grid max-w-site gap-12 px-5 md:px-14 lg:grid-cols-2">
          <Reveal>
            <Label>Персональный запрос</Label>
            <h2 className="font-heading text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-white md:text-[2.8rem]">
              Первый шаг — разговор с личным куратором
            </h2>
            <p className="mt-6 max-w-[460px] leading-relaxed text-white/60">
              Обсудим ситуацию, ответим на вопросы и подберём программу. Консультация ни к чему не обязывает, а её содержание остаётся между нами.
            </p>
            <div className="mt-8 flex flex-col gap-3 text-sm text-white/70">
              {["Ответ в течение 15 минут, круглосуточно", "Можно обратиться за близкого человека", "Выезд врача на дом в день обращения"].map((t) => (
                <p key={t} className="flex items-center gap-3"><Icon name="Check" size={16} className={GOLD} />{t}</p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120} className="premium-card rounded-3xl p-6 md:p-8">
            <PremiumForm />
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-white/40 md:flex-row md:px-14">
          <img src="/logo-premium-mark.png" alt="" className="h-7 w-auto opacity-80" />
          <p>© {new Date().getFullYear()} addict.clinic PREMIUM · Анонимно и конфиденциально</p>
          <Link to="/" className="transition-colors hover:text-white">Основной сайт клиники</Link>
        </div>
        <div className="mx-auto flex max-w-site flex-col gap-3 border-t border-white/5 px-5 py-6 text-xs text-white/35 md:px-14">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white">{l.label}</a>
            ))}
          </nav>
          <p>Оператор: {ORG.fullName}, ИНН {ORG.inn}, ОГРН {ORG.ogrn}. {ORG.email}</p>
        </div>
      </footer>
    </div>
  );
};

export default Premium;