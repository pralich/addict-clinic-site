import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Hero from "@/components/clinic/Hero";
import Problems from "@/components/clinic/Problems";
import Methods from "@/components/clinic/Methods";
import Support from "@/components/clinic/Support";
import Denial from "@/components/clinic/Denial";
import Teens from "@/components/clinic/Teens";
import FamilyCabinet from "@/components/clinic/FamilyCabinet";
import Privacy from "@/components/clinic/Privacy";
import Doctors from "@/components/clinic/Doctors";
import Steps from "@/components/clinic/Steps";
import Faq from "@/components/clinic/Faq";
import LatestArticles from "@/components/clinic/LatestArticles";
import Contacts from "@/components/clinic/Contacts";
import SeoText from "@/components/clinic/SeoText";
import Footer from "@/components/clinic/Footer";
import { PHONE_HREF } from "@/components/clinic/contacts";
import { useSeo } from "@/lib/seo";
import { CLINIC_ID, clinicNode, conditionNodes, faqNode, graph, howToNode, logoNode, orgNode, physicianNodes, websiteNode, webPage } from "@/lib/schema";

const HOME_LD = graph(
  clinicNode,
  orgNode,
  logoNode,
  websiteNode,
  webPage({
    type: ["MedicalWebPage", "WebPage"],
    path: "/",
    name: "Анонимное лечение зависимостей в Москве 24/7 — addict.clinic",
    extra: { about: { "@id": CLINIC_ID }, mainEntity: { "@id": CLINIC_ID }, audience: { "@type": "PeopleAudience", audienceType: "Люди с зависимостями и их близкие" } },
  }),
  ...physicianNodes,
  faqNode,
  howToNode,
  { "@type": "ItemList", name: "С чем помогаем", itemListElement: conditionNodes.map((c, i) => ({ "@type": "ListItem", position: i + 1, item: c })) },
);

const Index = () => {
  useSeo({
    title: "Анонимное лечение зависимостей в Москве 24/7 — addict.clinic",
    description: "Анонимное лечение алкоголизма, наркомании, лекарственной зависимости и игромании. Срочный выезд нарколога 24/7, без постановки на учёт. Бесплатная консультация: 8-800-222-11-25.",
    path: "/",
    jsonLd: HOME_LD,
  });
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Problems />
        <Methods />
        <Support />
        <Denial />
        <Teens />
        <FamilyCabinet />
        <Privacy />
        <Doctors />
        <Steps />
        <Faq />
        <LatestArticles />
        <SeoText />
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