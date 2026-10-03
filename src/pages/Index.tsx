import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Hero from "@/components/clinic/Hero";
import Problems from "@/components/clinic/Problems";
import Methods from "@/components/clinic/Methods";
import Support from "@/components/clinic/Support";
import Privacy from "@/components/clinic/Privacy";
import Doctors from "@/components/clinic/Doctors";
import Steps from "@/components/clinic/Steps";
import Faq from "@/components/clinic/Faq";
import LatestArticles from "@/components/clinic/LatestArticles";
import Contacts from "@/components/clinic/Contacts";
import Footer from "@/components/clinic/Footer";
import { PHONE_HREF } from "@/components/clinic/contacts";
import { FAQ } from "@/components/clinic/Faq";
import { useSeo } from "@/lib/seo";

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

const Index = () => {
  useSeo({
    title: "Анонимное лечение зависимостей в Москве 24/7 — addict.clinic",
    description: "Анонимное лечение алкоголизма, наркомании, лекарственной зависимости и игромании. Срочный выезд нарколога 24/7, без постановки на учёт. Бесплатная консультация: 8 800 555-24-07.",
    path: "/",
    jsonLd: FAQ_LD,
  });
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Problems />
        <Methods />
        <Support />
        <Privacy />
        <Doctors />
        <Steps />
        <Faq />
        <LatestArticles />
        <Contacts />
      </main>
      <Footer />
      <a
        href={PHONE_HREF}
        className="accent-glow fixed bottom-4 left-4 right-4 z-40 flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground md:hidden"
      >
        <Icon name="Phone" size={16} />
        Срочная помощь 24/7
      </a>
    </div>
  );
};

export default Index;