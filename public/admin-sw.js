const CACHE = "clinic-crm-v2";
const SHELL = ["/admin", "/admin.webmanifest", "/admin-192.png", "/admin-512.png", "/admin-favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("clinic-crm-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
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
          caches.open(CACHE).then((c) => c.put("/admin", copy));
          return res;
        })
        .catch(() => caches.match("/admin"))
    );
    return;
  }

  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
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
    Promise.all([
      self.registration.showNotification(data.title || "Clinic CRM", {
        body: data.body || "",
        icon: "/admin-192.png",
        badge: "/admin-192.png",
        tag: data.tag,
        renotify: !!data.tag,
        requireInteraction: true,
        vibrate: [120, 60, 120],
        data: { url: data.url || "/admin" },
      }),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => list.forEach((c) => c.postMessage({ type: "crm-push", payload: data }))),
      self.navigator && "setAppBadge" in self.navigator ? self.navigator.setAppBadge().catch(() => null) : null,
    ])
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "/admin", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin + "/admin") && "focus" in c) {
          c.postMessage({ type: "crm-open", url: target });
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
