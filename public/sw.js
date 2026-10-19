const CACHE = "addict-clinic-v5";
const SHELL = ["/", "/site.webmanifest", "/family.webmanifest", "/family-192.png", "/pwa-192.png", "/pwa-512.png", "/logo.png", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(src|node_modules|@)/.test(url.pathname) || url.search.includes("t=")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (url.pathname === "/" && res.ok) caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "addict.clinic", {
      body: data.body || "",
      icon: (data.url || "/family").startsWith("/family") ? "/family-192.png" : "/pwa-192.png",
      badge: "/pwa-192.png",
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || "/family" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "/family", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
