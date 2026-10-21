import fs from "fs";
import path from "path";
import { TREATMENTS, ogImage } from "./src/lib/treatments";
import { MED_LICENSE } from "./src/lib/legal";
import { HOME_SEO_INTRO, HOME_SEO_PROGRAMS_H2, HOME_SEO_SECTIONS, parseLinks } from "./src/lib/home-seo";

const SITE = "https://addict.clinic";
const PHONE = "8-800-222-11-25";
const PHONE_HREF = "tel:+78002221125";
const OG = `${SITE}/og-image.jpg?v=3`;

const CATEGORIES: Record<string, string> = {
  rehab: "Реабилитация", alcohol: "Алкоголизм", drugs: "Наркомания", meds: "Лекарственная зависимость", gambling: "Игромания",
  codependency: "Созависимость", eating: "Пищевое поведение", nicotine: "Никотин", internet: "Интернет-зависимость", mental: "Депрессия и тревога",
};

type Article = { slug: string; title: string; excerpt?: string; meta_title?: string; meta_description?: string; cover_url?: string; cover_alt?: string; category?: string; content?: string; author?: string; published_at?: string; updated_at?: string };

type Page = { path: string; title: string; description: string; image?: string; noindex?: boolean; h1: string; body: string; crumbs?: [string, string][]; ld?: object[] };

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const p = (s: string) => `<p>${esc(s)}</p>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
const a = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
const iso = (d?: string) => (d ? new Date(d.endsWith("Z") ? d : `${d}Z`).toISOString() : undefined);

const NAV = `<nav aria-label="Основное меню">${[
  a("/", "Главная"), a("/lechenie", "Лечение"), ...TREATMENTS.map((t) => a(t.path, t.menu)), a("/premium", "PREMIUM"), a("/articles", "Статьи"), a("/shop", "Магазин"),
].join(" · ")}</nav>`;
const FOOT = `<footer><p>Анонимная помощь 24/7: <a href="${PHONE_HREF}">${PHONE}</a>. Москва, Ленинградский проспект, 58.</p><p>${[
  a("/privacy", "Политика конфиденциальности"), a("/consent", "Согласие на обработку данных"), a("/offer", "Оферта"), a("/cookies", "Cookie"), a("/requisites", "Реквизиты"),
].join(" · ")}</p><p>Лицензия на осуществление медицинской деятельности № ${esc(MED_LICENSE.number)} от ${esc(MED_LICENSE.date)}. ${esc(MED_LICENSE.fullName)} (${esc(MED_LICENSE.shortName)}), ОГРН ${esc(MED_LICENSE.ogrn)}. Адрес: ${esc(MED_LICENSE.address)}.</p></footer>`;

const faq = (items: { q: string; a: string }[]) => `<h2>Частые вопросы</h2>${items.map((f) => `<h3>${esc(f.q)}</h3>${p(f.a)}`).join("")}`;

const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

const markdown = (src = "") => {
  const out: string[] = [];
  const lines = src.replace(/\r/g, "").split("\n");
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = []; } };
  let custom = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (l.startsWith(":::")) { flush(); custom = !custom && l !== ":::"; continue; }
    if (custom) { if (l) out.push(`<p>${inline(l.replace(/\|/g, " — "))}</p>`); continue; }
    if (!l) { flush(); continue; }
    if (/^[-*] /.test(l) || /^\d+[.)] /.test(l)) { list.push(l.replace(/^([-*]|\d+[.)]) /, "")); continue; }
    flush();
    if (l.startsWith("### ")) out.push(`<h3>${inline(l.slice(4))}</h3>`);
    else if (l.startsWith("## ")) out.push(`<h2>${inline(l.slice(3))}</h2>`);
    else if (l.startsWith("> ")) out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`);
    else if (l.startsWith("|")) { if (!/^\|[\s:|-]+\|$/.test(l)) out.push(`<p>${inline(l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).join(" — "))}</p>`); }
    else { const img = l.match(/^!\[(.*?)\]\((.+?)\)$/); out.push(img ? `<img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy">` : `<p>${inline(l)}</p>`); }
  }
  flush();
  return out.join("");
};

const crumbsLd = (crumbs: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [["Главная", "/"] as [string, string], ...crumbs].map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + url })),
});

const setTag = (html: string, re: RegExp, value: string) => (re.test(html) ? html.replace(re, value) : html.replace("</head>", `${value}\n</head>`));

const render = (tpl: string, pg: Page) => {
  const url = SITE + (pg.path === "/" ? "/" : pg.path);
  const img = pg.image ? (pg.image.startsWith("http") ? pg.image : SITE + pg.image) : OG;
  let html = tpl;
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(pg.title)}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(pg.description)}"/>`);
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}"/>`);
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(pg.title)}">`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(pg.description)}">`);
  html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(img)}">`);
  html = setTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(pg.title)}">`);
  html = setTag(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(pg.description)}">`);
  html = setTag(html, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(img)}">`);
  if (pg.noindex) html = setTag(html, /<meta name="robots"[^>]*>/, `<meta name="robots" content="noindex, nofollow"/>`);
  if (pg.path.startsWith("/articles/")) html = html.replace(/<meta property="og:type"[^>]*>/, '<meta property="og:type" content="article">');
  const ld = [...(pg.crumbs ? [crumbsLd(pg.crumbs)] : []), ...(pg.ld || [])];
  const ldTags = ld.map((o) => `<script type="application/ld+json" data-prerender>${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  if (ldTags) html = html.replace("</head>", `${ldTags}\n</head>`);
  const crumbsHtml = pg.crumbs ? `<nav aria-label="Хлебные крошки">${[a("/", "Главная"), ...pg.crumbs.map(([n, u]) => a(u, n))].join(" › ")}</nav>` : "";
  const content = `<div id="seo-static" style="max-width:860px;margin:0 auto;padding:24px 20px;font-family:Inter,system-ui,sans-serif;line-height:1.55;color:#1b1c1e">${NAV}${crumbsHtml}<main><h1>${esc(pg.h1)}</h1>${pg.body}</main>${FOOT}</div>`;
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
};

const write = (dist: string, route: string, html: string) => {
  if (route === "/") { fs.writeFileSync(path.join(dist, "index.html"), html); return; }
  const clean = route.replace(/^\/|\/$/g, "");
  const dir = path.join(dist, clean);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  fs.writeFileSync(path.join(dist, `${clean}.html`), html);
};

const getJson = async (url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

const staticPages = (articles: Article[]): Page[] => [
  {
    path: "/",
    title: "Анонимное лечение зависимостей в Москве 24/7 — addict.clinic",
    description: "Анонимное лечение алкоголизма, наркомании, лекарственной зависимости и игромании. Срочный выезд нарколога 24/7, без постановки на учёт. Бесплатная консультация: 8-800-222-11-25.",
    h1: "Анонимное лечение зависимостей в Москве",
    body: [
      p("Наркологи, психологи и реабилитологи одной командой. Лечим без постановки на учёт и сопровождаем на каждом этапе — от первого звонка до устойчивой ремиссии."),
      `<p>Срочная помощь 24/7: <a href="${PHONE_HREF}">${PHONE}</a>. Выезд врача по Москве и области за 40–60 минут.</p>`,
      p(HOME_SEO_INTRO),
      `<h2>${esc(HOME_SEO_PROGRAMS_H2)}</h2>`,
      `<ul>${TREATMENTS.map((t) => `<li>${a(t.path, t.menu)} — ${esc(t.hint)}</li>`).join("")}</ul>`,
      `<p>${a("/lechenie", "Все направления лечения")}</p>`,
      ...HOME_SEO_SECTIONS.map((s) => `<h2>${esc(s.h2)}</h2>${s.paras.map((x) => `<p>${parseLinks(x).map((c) => (c.href ? a(c.href, c.text) : esc(c.text))).join("")}</p>`).join("")}`),
      articles.length ? `<h2>Статьи врачей</h2><ul>${articles.slice(0, 8).map((x) => `<li>${a(`/articles/${x.slug}`, x.title)}</li>`).join("")}</ul>` : "",
    ].join(""),
  },
  {
    path: "/lechenie",
    title: "Лечение зависимостей в Москве анонимно 24/7 — addict.clinic",
    description: "Анонимное лечение наркомании, алкоголизма, игромании, игровой зависимости и РПП в Москве. Выезд врача 24/7, стационар, реабилитация, психотерапия. Звоните: 8-800-222-11-25.",
    h1: "Лечение зависимостей в Москве",
    crumbs: [["Лечение", "/lechenie"]],
    body: TREATMENTS.map((t) => `<h2>${a(t.path, t.h1)}</h2>${p(t.lead)}`).join(""),
  },
  ...TREATMENTS.map((t): Page => ({
    path: t.path,
    title: t.title,
    description: t.description,
    image: ogImage(t),
    h1: t.h1,
    crumbs: [["Лечение", "/lechenie"], [t.h1, t.path]],
    body: [
      p(t.lead),
      `<img src="${esc(t.image)}" alt="${esc(t.h1)}" width="1360" height="583">`,
      `<ul>${t.facts.map((f) => `<li><strong>${esc(f.value)}</strong> — ${esc(f.label)}</li>`).join("")}</ul>`,
      "<h2>Признаки зависимости</h2>", ul(t.signs),
      "<h2>Когда нужна срочная помощь</h2>", ul(t.urgent),
      "<h2>Программы лечения</h2>",
      t.programs.map((g) => `<h3>${esc(g.name)} (${esc(g.term)})</h3>${p(g.text)}${ul(g.points)}`).join(""),
      "<h2>Этапы лечения</h2>",
      `<ol>${t.stages.map((s) => `<li><strong>${esc(s.title)}</strong>: ${esc(s.text)}</li>`).join("")}</ol>`,
      "<h2>Методы</h2>", ul(t.methods),
      faq(t.faq),
    ].join(""),
  })),
  {
    path: "/articles",
    title: "Статьи о зависимостях и их лечении — addict.clinic",
    description: "Полезные материалы врачей addict.clinic: признаки зависимостей, как помочь близкому, вывод из запоя, лечение наркомании, игромании, РПП и депрессии. Анонимная помощь 24/7.",
    h1: "Статьи о зависимостях и их лечении",
    crumbs: [["Статьи", "/articles"]],
    body: p("Честно и понятно о признаках, лечении и помощи близким. Все материалы проверены нашими наркологами и психологами.") +
      articles.map((x) => `<article><h2>${a(`/articles/${x.slug}`, x.title)}</h2>${x.excerpt ? p(x.excerpt) : ""}</article>`).join(""),
  },
  {
    path: "/premium",
    title: "VIP-лечение зависимостей анонимно — addict.clinic PREMIUM",
    description: "Премиальная программа лечения зависимостей: абсолютная анонимность с гарантией в договоре, врачи с мировым именем, частная резиденция с люксами, SPA и личным куратором.",
    image: "/og-premium.jpg",
    h1: "Лечение зависимости, о котором не узнает никто",
    crumbs: [["PREMIUM", "/premium"]],
    body: p("Закрытая программа для тех, кому важны абсолютная конфиденциальность, врачи с мировым именем и условия загородной резиденции.") +
      ul(["Анонимность с гарантией в договоре", "Персональная команда врачей", "Частная резиденция, отдельное размещение", "Личный куратор на всё время программы"]),
  },
  {
    path: "/shop",
    title: "Магазин addict.clinic — мерч, подарочные сертификаты, литература",
    description: "Подарочные сертификаты на консультации психолога, книги и рабочие тетради для семей, мерч клиники. Анонимная упаковка, доставка по России.",
    image: "/og-shop.jpg?v=1",
    h1: "Подарки, которые поддерживают",
    crumbs: [["Магазин", "/shop"]],
    body: p("Сертификаты на помощь специалистов, книги для семей и вещи, которые напоминают: выздоровление возможно. Анонимная упаковка, доставка по России."),
  },
  {
    path: "/family",
    title: "Кабинет для родственников зависимых — addict.clinic",
    description: "Бесплатный личный кабинет для близких зависимых: вопросы психологу, группы поддержки и вебинары, ИИ-психолог для подготовки разговора о лечении.",
    image: "/og-family.jpg?v=1",
    noindex: true,
    h1: "Кабинет для близких зависимого",
    body: p("Вопросы психологу, ИИ-помощник для подготовки разговора о лечении, группы поддержки и вебинары для родственников."),
  },
  ...([
    ["/privacy", "Политика обработки персональных данных"],
    ["/consent", "Согласие на обработку персональных данных"],
    ["/offer", "Публичная оферта"],
    ["/cookies", "Политика cookie"],
    ["/requisites", "Реквизиты"],
  ] as const).map(([path, h1]): Page => ({
    path, h1, title: `${h1} — addict.clinic`, description: `${h1} сайта addict.clinic. Оператор — АНО «АЦРРС», Москва.`, crumbs: [[h1, path]], body: "",
  })),
];

const articlePage = (x: Article): Page => {
  const cat = x.category ? CATEGORIES[x.category] : undefined;
  const url = `${SITE}/articles/${x.slug}`;
  return {
    path: `/articles/${x.slug}`,
    title: x.meta_title || `${x.title} — addict.clinic`,
    description: x.meta_description || x.excerpt || x.title,
    image: x.cover_url,
    h1: x.title,
    crumbs: [["Статьи", "/articles"], ...(cat && x.category ? [[cat, `/articles?category=${x.category}`] as [string, string]] : []), [x.title, `/articles/${x.slug}`]],
    ld: [{
      "@context": "https://schema.org",
      "@type": "Article",
      headline: x.title.slice(0, 110),
      description: x.meta_description || x.excerpt,
      image: x.cover_url ? [x.cover_url] : [`${SITE}/logo.png`],
      datePublished: iso(x.published_at),
      dateModified: iso(x.updated_at || x.published_at),
      author: x.author ? { "@type": "Person", name: x.author } : { "@type": "Organization", name: "addict.clinic", url: SITE },
      publisher: { "@type": "Organization", name: "addict.clinic", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } },
      mainEntityOfPage: url,
      inLanguage: "ru-RU",
    }],
    body: [
      x.excerpt ? `<p><strong>${esc(x.excerpt)}</strong></p>` : "",
      x.cover_url ? `<img src="${esc(x.cover_url)}" alt="${esc(x.cover_alt || x.title)}" width="1360" height="768">` : "",
      x.author ? `<p>Автор: ${esc(x.author)}</p>` : "",
      markdown(x.content),
    ].join(""),
  };
};

export const prerender = async (dist: string, articlesUrl?: string) => {
  const tplPath = path.join(dist, "index.html");
  if (!fs.existsSync(tplPath)) return;
  const tpl = fs.readFileSync(tplPath, "utf-8");
  fs.writeFileSync(path.join(dist, "spa.html"), tpl);
  let list: Article[] = [];
  const full: Article[] = [];
  if (articlesUrl) {
    try {
      list = (await getJson(articlesUrl)).items || [];
      for (let i = 0; i < list.length; i += 6) {
        const chunk = await Promise.all(list.slice(i, i + 6).map((x) => getJson(`${articlesUrl}?slug=${encodeURIComponent(x.slug)}&prerender=1`).then((r) => r.item as Article).catch(() => null)));
        chunk.forEach((x) => x && full.push(x));
      }
    } catch (e) {
      console.warn("prerender: статьи не загружены", e);
    }
  }
  const pages = [...staticPages(list), ...full.map(articlePage)];
  for (const pg of pages) write(dist, pg.path, render(tpl, pg));
  console.log(`prerender: ${pages.length} страниц`);
};
