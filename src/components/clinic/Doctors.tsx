import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";

export const DOCTORS = [
  {
    photo: "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/291e2d7c-2f5c-46e8-9342-1c220aec41a1.jpg",
    name: "Андрей Волков",
    role: "Главный врач, психиатр-нарколог",
    exp: "22 года опыта",
    tag: "Высшая категория",
  },
  {
    photo: "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/ae2a2e38-189f-4cb0-a528-0acf26a0f83b.jpg",
    name: "Мария Соколова",
    role: "Клинический психолог, руководитель психологической службы",
    exp: "12 лет опыта",
    tag: "КПТ, семейная терапия",
  },
  {
    photo: "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/65ede916-e641-48b8-80b8-195dee4942b0.jpg",
    name: "Дмитрий Орлов",
    role: "Врач-нарколог выездной бригады",
    exp: "15 лет опыта",
    tag: "Неотложная помощь",
  },
];

const Doctors = () => (
  <section id="doctors" className="scroll-mt-16 bg-secondary py-20 md:py-28">
    <div className="mx-auto max-w-[1280px] px-5 md:px-16">
      <SectionHead
        label="Врачи"
        title={<>Команда, которой<br className="hidden md:block" /> доверяют самое личное.</>}
        text="42 специалиста: наркологи, психиатры, психологи и реабилитологи. Все — с профильным образованием и регулярным повышением квалификации."
      />
      <div className="grid gap-[7px] md:grid-cols-3">
        {DOCTORS.map((d, i) => (
          <Reveal key={d.name} delay={i * 100} className="group overflow-hidden rounded-[10px] bg-card">
            <div className="relative aspect-[4/4.3] overflow-hidden">
              <img
                src={d.photo}
                alt={d.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1.5 text-[0.8em] font-medium backdrop-blur">
                {d.tag}
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-heading text-[1.3em] font-semibold tracking-tight">{d.name}</h3>
              <p className="mt-1 text-[0.95em] leading-snug text-muted-foreground">{d.role}</p>
              <p className="mt-4 flex items-center gap-2 text-[0.9em] font-medium">
                <Icon name="Award" size={16} className="text-primary" />
                {d.exp}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Doctors;
