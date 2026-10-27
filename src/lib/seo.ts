import { useEffect } from "react";

export const SITE_URL = "https://addict.clinic";

type Seo = {
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

const setLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

export const useSeo = ({ title, description, path, image = "/og-image.jpg?v=3", noindex, jsonLd }: Seo) => {
  useEffect(() => {
    const url = SITE_URL + path;
    const img = image.startsWith("http") ? image : SITE_URL + image;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setLink("canonical", url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);

    const prev = document.getElementById("page-jsonld");
    prev?.remove();
    if (jsonLd) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = "page-jsonld";
      s.text = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
    return () => document.getElementById("page-jsonld")?.remove();
  }, [title, description, path, image, noindex, jsonLd]);
};

export type SeoInput = Seo;

// Те же теги, что ставит useSeo, но для head() маршрута: попадают в HTML ещё на сервере.
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
    scripts: jsonLd ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }] : [],
  };
};