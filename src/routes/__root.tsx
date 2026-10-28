import {useEffect, type ReactNode} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import InstallPrompt from "@/components/InstallPrompt";
import SiteWidget from "@/components/SiteWidget";
import CookieBanner from "@/components/legal/CookieBanner";
import PageNotFound from "@/components/PageNotFound";
import {captureAttribution} from "@/lib/attribution";
import {initVisitTracker} from "@/lib/visit-tracker";
import {initGoalClicks} from "@/lib/goals";
import {ldScript} from "@/lib/seo";
import {ROOT_LD} from "@/lib/root-ld";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import appCss from "@/index.css?url";

const TITLE = "Анонимное лечение зависимостей в Москве 24/7 — addict.clinic";
const DESCRIPTION =
    "Анонимное лечение алкоголизма, наркомании, лекарственной зависимости и игромании. Срочный выезд нарколога 24/7, без постановки на учёт. Бесплатная консультация: 8-800-222-11-25.";
const OG_TITLE = "Анонимное лечение зависимостей 24/7 — addict.clinic";
const OG_DESCRIPTION = "Срочный выезд врача, лечение без постановки на учёт, психологическая поддержка круглосуточно.";
const OG_IMAGE = "https://addict.clinic/og-image.jpg?v=3";

// Google Tag Manager (не на CRM и в кабинете партнёра) — как было в index.html.
const GTM = `if(!/^\\/(admin|partner)(\\/|$)/.test(location.pathname)){(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W6J2QKFH');}`;

// PWA-настройки по разделу сайта (манифест, иконки, запрет зума в кабинетах) — как было в index.html.
const BOOT = `(function () {
  var admin = location.pathname === "/admin" || location.pathname.indexOf("/admin/") === 0;
  var family = location.pathname === "/family" || location.pathname.indexOf("/family/") === 0;
  var partner = location.pathname === "/partner" || location.pathname.indexOf("/partner/") === 0;
  var noZoom = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
  var c = family
    ? { manifest: "/family.webmanifest?v=2", icon: "/family-apple-touch-icon.png?v=1", title: "Близкие", bar: "default", theme: "#F3F3F1", png: "/family-favicon-32.png", viewport: noZoom }
    : admin || partner
    ? { manifest: "/admin.webmanifest?v=3", icon: "/admin-apple-touch-icon.png?v=3", title: partner ? "Кабинет партнёра" : "Clinic CRM", bar: "black-translucent", theme: "#1B1B1A", svg: "/admin-favicon.svg", png: "/admin-favicon-32.png", viewport: noZoom }
    : { manifest: "/site.webmanifest?v=3", icon: "/apple-touch-icon.png?v=2", title: "addict.clinic", bar: "default", theme: "#F3F3F1" };
  var head = document.head;
  var add = function (tag, attrs) { var el = document.createElement(tag); for (var k in attrs) el.setAttribute(k, attrs[k]); head.appendChild(el); };
  add("link", { rel: "manifest", href: c.manifest });
  add("link", { rel: "apple-touch-icon", sizes: "180x180", href: c.icon });
  add("meta", { name: "mobile-web-app-capable", content: "yes" });
  add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  add("meta", { name: "apple-mobile-web-app-status-bar-style", content: c.bar });
  add("meta", { name: "apple-mobile-web-app-title", content: c.title });
  add("meta", { name: "application-name", content: c.title });
  var set = function (sel, attr, val) { var el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
  set('meta[name="theme-color"]', "content", c.theme);
  if (c.svg) set('link[rel="icon"][type="image/svg+xml"]', "href", c.svg);
  if (c.png) set('link[rel="icon"][sizes="32x32"]', "href", c.png);
  if (c.viewport) set('meta[name="viewport"]', "content", c.viewport);
  if (family) document.documentElement.className += " boot-family";
  if (c.viewport === noZoom) {
    document.documentElement.className += " app-locked";
    var stop = function (e) { e.preventDefault(); };
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  }
})();`;

const BOOT_CSS = `#boot-splash { display: none; }
.boot-family, .boot-family body { background: #1B1B1A; }
.boot-family #boot-splash { display: flex; position: fixed; inset: 0; z-index: 199; align-items: center; justify-content: center; overflow: hidden; background: #1B1B1A; }
#boot-splash .bs-glow { position: absolute; width: 60vmax; height: 60vmax; border-radius: 9999px; filter: blur(80px); opacity: .35; background: #E02B2F; top: -25vmax; left: -20vmax; }
#boot-splash .bs-glow + .bs-glow { background: rgba(224,43,47,.55); top: auto; left: auto; bottom: -30vmax; right: -25vmax; }
#boot-splash .bs-box { position: relative; width: 144px; height: 144px; display: flex; align-items: center; justify-content: center; margin-bottom: 121px; }
#boot-splash .bs-ring { position: absolute; inset: 6px; border-radius: 9999px; border: 2px solid rgba(255,255,255,.08); border-top-color: #E02B2F; animation: bs-spin 1.4s linear infinite; }
#boot-splash img { width: 80px; height: 80px; border-radius: 22px; box-shadow: 0 20px 60px -10px rgba(224,43,47,.6); }
@keyframes bs-spin { to { transform: rotate(360deg); } }`;

const NF_TITLE = "Страница не найдена — addict.clinic";
const NF_DESCRIPTION = "Такой страницы нет на сайте addict.clinic. Перейдите к разделам лечения, услуг или статей.";

export const Route = createRootRoute({
    head: ({match}) => {
        const nf = Boolean(match._notFound);
        return {
        meta: [
            {charSet: "utf-8"},
            {name: "viewport", content: "width=device-width, initial-scale=1.0"},
            {title: nf ? NF_TITLE : TITLE},
            {name: "description", content: nf ? NF_DESCRIPTION : DESCRIPTION},
            {name: "keywords", content: "лечение зависимостей, анонимное лечение алкоголизма, лечение наркомании, вывод из запоя, нарколог на дом, игромания лечение, реабилитация, наркологическая клиника Москва"},
            {name: "robots", content: nf ? "noindex, follow" : "index, follow, max-image-preview:large"},
            {name: "author", content: "addict.clinic"},
            {name: "theme-color", content: "#F3F3F1"},
            {name: "format-detection", content: "telephone=yes"},
            {name: "geo.region", content: "RU-MOW"},
            {name: "geo.placename", content: "Москва"},
            {name: "yandex-verification", content: "b89680300e31175f"},
            {property: "og:type", content: "website"},
            {property: "og:site_name", content: "addict.clinic"},
            {property: "og:locale", content: "ru_RU"},
            {property: "og:url", content: "https://addict.clinic/"},
            {property: "og:title", content: nf ? NF_TITLE : OG_TITLE},
            {property: "og:description", content: nf ? NF_DESCRIPTION : OG_DESCRIPTION},
            {property: "og:image", content: OG_IMAGE},
            {property: "og:image:width", content: "1200"},
            {property: "og:image:height", content: "630"},
            {property: "og:image:alt", content: "addict.clinic — анонимное лечение зависимостей"},
            {name: "twitter:card", content: "summary_large_image"},
            {name: "twitter:title", content: nf ? NF_TITLE : OG_TITLE},
            {name: "twitter:description", content: nf ? NF_DESCRIPTION : OG_DESCRIPTION},
            {name: "twitter:image", content: OG_IMAGE},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "stylesheet", href: appCss},
            {rel: "alternate", type: "application/rss+xml", title: "Статьи addict.clinic", href: "https://addict.clinic/rss.xml"},
            {rel: "preconnect", href: "https://fonts.googleapis.com"},
            {rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous"},
            {rel: "preconnect", href: "https://cdn.poehali.dev", crossOrigin: "anonymous"},
            {rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"},
            {rel: "icon", href: "/favicon.ico?v=2", sizes: "any"},
            {rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=2"},
            {rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=2"},
        ],
        styles: [{children: BOOT_CSS}],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
            {children: GTM},
            {children: BOOT},
            ldScript(ROOT_LD),
        ],
        };
    },
    component: RootComponent,
    notFoundComponent: PageNotFound,
});

function RootComponent() {
    // То, что раньше запускал main.tsx: метки источника, трекер визитов, цели, service worker.
    useEffect(() => {
        captureAttribution();
        initVisitTracker();
        initGoalClicks();
        if (!("serviceWorker" in navigator)) return;
        const register = () => {
            if (location.pathname.startsWith("/admin")) {
                navigator.serviceWorker.register("/admin-sw.js", {scope: "/admin"}).catch(() => null);
            } else {
                navigator.serviceWorker.register("/sw.js").catch(() => null);
            }
        };
        if (document.readyState === "complete") register();
        else {
            window.addEventListener("load", register);
            return () => window.removeEventListener("load", register);
        }
    }, []);

    return (
        <RootDocument>
            <TooltipProvider>
                <Toaster/>
                <Sonner/>
                <InstallPrompt/>
                <SiteWidget/>
                <Outlet/>
                <CookieBanner/>
            </TooltipProvider>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru" suppressHydrationWarning>
        <head>
            <HeadContent/>
        </head>
        <body>
        <noscript>
            <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W6J2QKFH" height="0" width="0"
                    style={{display: "none", visibility: "hidden"}}/>
        </noscript>
        <div id="boot-splash" aria-hidden="true" suppressHydrationWarning>
            <div className="bs-glow"/>
            <div className="bs-glow"/>
            <div className="bs-box"><span className="bs-ring"/><img src="/family-192.png" alt=""/></div>
        </div>
        {children}
        <Scripts/>
        </body>
        </html>
    );
}
