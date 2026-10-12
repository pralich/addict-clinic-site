import { ORG } from "@/lib/legal";
import { SITE_URL } from "@/lib/seo";
import { DOCTORS } from "@/components/clinic/Doctors";
import { PROBLEMS } from "@/components/clinic/Problems";
import { METHODS } from "@/components/clinic/Methods";
import { STEPS } from "@/components/clinic/Steps";
import { FAQ } from "@/components/clinic/Faq";

export const CLINIC_ID = `${SITE_URL}/#clinic`;
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LOGO_ID = `${SITE_URL}/#logo`;

const CTX = "https://schema.org";
const PHONE = "+7-800-222-11-25";

const address = {
  "@type": "PostalAddress",
  streetAddress: "Ленинградский проспект, д. 58, помещ. 1П",
  addressLocality: "Москва",
  addressRegion: "Москва",
  postalCode: "125167",
  addressCountry: "RU",
};

const logo = { "@type": "ImageObject", "@id": LOGO_ID, url: `${SITE_URL}/logo.png`, contentUrl: `${SITE_URL}/logo.png`, caption: "addict.clinic" };

export const orgNode = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: ORG.shortName,
  legalName: ORG.fullName,
  url: SITE_URL,
  email: ORG.email,
  taxID: ORG.inn,
  identifier: [
    { "@type": "PropertyValue", propertyID: "ИНН", value: ORG.inn },
    { "@type": "PropertyValue", propertyID: "КПП", value: ORG.kpp },
    { "@type": "PropertyValue", propertyID: "ОГРН", value: ORG.ogrn },
  ],
  address,
  logo: { "@id": LOGO_ID },
  employee: { "@type": "Person", name: ORG.director, jobTitle: ORG.directorPosition },
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");

export const physicianNodes = DOCTORS.map((d) => ({
  "@type": "Physician",
  "@id": `${SITE_URL}/#doctor-${slug(d.name)}`,
  name: d.name,
  jobTitle: d.role,
  image: d.photo,
  description: `${d.role}. ${d.exp}. ${d.tag}.`,
  worksFor: { "@id": CLINIC_ID },
  medicalSpecialty: "Psychiatric",
}));

export const clinicNode = {
  "@type": ["MedicalClinic", "MedicalOrganization", "LocalBusiness"],
  "@id": CLINIC_ID,
  name: "addict.clinic",
  alternateName: "Аддикт Клиник",
  url: `${SITE_URL}/`,
  logo: { "@id": LOGO_ID },
  image: `${SITE_URL}/og-image.jpg?v=2`,
  description: "Медицинский центр анонимного лечения зависимостей: алкоголизм, наркомания, лекарственная зависимость, игромания. Выезд врача 24/7.",
  telephone: PHONE,
  email: ORG.email,
  priceRange: "₽₽",
  currenciesAccepted: "RUB",
  paymentAccepted: "Наличные, банковская карта, безналичный расчёт",
  isAcceptingNewPatients: true,
  medicalSpecialty: ["Psychiatric", "Emergency"],
  address,
  areaServed: [{ "@type": "City", name: "Москва" }, { "@type": "AdministrativeArea", name: "Московская область" }],
  parentOrganization: { "@id": ORG_ID },
  contactPoint: [
    { "@type": "ContactPoint", telephone: PHONE, contactType: "emergency", availableLanguage: ["ru"], hoursAvailable: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "00:00", closes: "23:59" } },
    { "@type": "ContactPoint", email: ORG.email, contactType: "customer service", availableLanguage: ["ru"] },
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  knowsAbout: PROBLEMS.map((p) => p.name),
  availableService: METHODS.map((m) => ({ "@type": "MedicalTherapy", name: m.name, description: m.text })),
  employee: physicianNodes.map((p) => ({ "@id": p["@id"] })),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Лечение зависимостей",
    itemListElement: PROBLEMS.map((p) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "MedicalTherapy",
        name: `Лечение: ${p.name.toLowerCase()}`,
        description: p.help.join(". "),
        relevantSpecialty: "Psychiatric",
      },
    })),
  },
};

export const websiteNode = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: "addict.clinic",
  inLanguage: "ru-RU",
  publisher: { "@id": CLINIC_ID },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/articles?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const breadcrumbs = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: [["Главная", "/"] as [string, string], ...items].map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: `${SITE_URL}${path}`,
  })),
});

type PageOpts = { type?: string | string[]; path: string; name: string; description?: string; crumbs?: [string, string][]; extra?: Record<string, unknown> };

export const webPage = ({ type = "WebPage", path, name, description, crumbs, extra }: PageOpts) => ({
  "@type": type,
  "@id": `${SITE_URL}${path}#webpage`,
  url: `${SITE_URL}${path}`,
  name,
  description,
  inLanguage: "ru-RU",
  isPartOf: { "@id": WEBSITE_ID },
  publisher: { "@id": CLINIC_ID },
  ...(crumbs ? { breadcrumb: breadcrumbs(crumbs) } : {}),
  ...extra,
});

export const graph = (...nodes: object[]) => ({ "@context": CTX, "@graph": nodes });

export const faqNode = {
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export const howToNode = {
  "@type": "HowTo",
  "@id": `${SITE_URL}/#how-to-start`,
  name: "Как начать анонимное лечение зависимости",
  description: "Пять шагов от первого звонка до ремиссии.",
  step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: `${s.text} (${s.time})` })),
};

export const conditionNodes = PROBLEMS.map((p) => ({
  "@type": "MedicalCondition",
  name: p.name,
  description: p.short,
  signOrSymptom: p.signs.map((s) => ({ "@type": "MedicalSignOrSymptom", name: s })),
  possibleTreatment: p.help.map((h) => ({ "@type": "MedicalTherapy", name: h })),
  url: `${SITE_URL}/articles?category=${p.category}`,
}));

export { logo as logoNode };

export const isoDate = (d?: string | null) => {
  if (!d) return undefined;
  const v = d.replace(" ", "T").replace(/\.\d+/, "");
  return /([+-]\d{2}:?\d{2}|Z)$/.test(v) ? v : `${v}+03:00`;
};
