import { useEffect } from "react";

export const SITE_URL = "https://addict.clinic";

export type Seo = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
};

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Старый способ (только в браузере, после рендера). Остался для страницы 404;
// остальные страницы задают мета-теги через head() маршрута.
export const useSeo = ({ title, description, noindex }: Seo) => {
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
  }, [title, description, noindex]);
};

// JSON-LD как <script type="application/ld+json"> в head() маршрута.
export const ldScript = (ld: object | object[]) => ({
  type: "application/ld+json",
  children: JSON.stringify(ld).replace(/</g, "\\u003c"),
});

// Мета-теги страницы для head() маршрута (раньше их ставил useSeo в браузере).
export const seoHead = ({ title, description, path, image = "/og-image.jpg?v=3", noindex, jsonLd }: Seo) => {
  const url = SITE_URL + path;
  const img = image.startsWith("http") ? image : SITE_URL + image;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: img },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: jsonLd ? [ldScript(jsonLd)] : [],
  };
};