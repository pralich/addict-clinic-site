(function () {
  var API = "https://functions.poehali.dev/1145187d-844f-4f3f-8a1f-575d26202624?resource=form_widget";
  var KEY = "_fwa1";
  var TTL = 90 * 864e5;
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var CLICKS = ["yclid", "gclid", "vkclid", "fbclid"];

  var script = document.currentScript || (function () {
    var s = document.querySelectorAll("script[data-token]");
    return s[s.length - 1];
  })();
  if (!script) return;
  var token = script.getAttribute("data-token");
  if (!token || window["__fw_" + token]) return;
  window["__fw_" + token] = 1;

  var store = {
    get: function () {
      try {
        var v = JSON.parse(localStorage.getItem(KEY) || "null");
        return v && v.first && Date.now() - v.first.at < TTL ? v : null;
      } catch (e) {
        return null;
      }
    },
    set: function (v) {
      try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    }
  };

  var cut = function (v, n) { return v ? String(v).slice(0, n) : undefined; };

  var own = function (url) {
    try { return new URL(url).hostname.replace(/^www\./, "") === location.hostname.replace(/^www\./, ""); } catch (e) { return true; }
  };

  var capture = function () {
    var p = new URLSearchParams(location.search);
    var t = { at: Date.now(), landing_url: cut(location.href, 500) };
    var meaningful = false;
    UTM.forEach(function (k) { var v = p.get(k); if (v) { t[k] = cut(v, 250); meaningful = true; } });
    for (var i = 0; i < CLICKS.length; i++) {
      var c = p.get(CLICKS[i]);
      if (c) { t.click_id = cut(CLICKS[i] + "=" + c, 250); meaningful = true; break; }
    }
    if (document.referrer && !own(document.referrer)) { t.referrer = cut(document.referrer, 500); meaningful = true; }
    var prev = store.get();
    if (!prev) store.set({ first: t, last: t });
    else if (meaningful) store.set({ first: prev.first, last: t });
  };

  var ymId = function () {
    var m = document.cookie.match(/(?:^|;\s*)_ym_uid=(\d+)/);
    return m ? m[1] : undefined;
  };

  var attribution = function () {
    var s = store.get() || {};
    var last = s.last || {};
    var first = s.first || {};
    var src = last.utm_source || last.click_id || last.referrer ? last : first;
    var a = {
      page_url: cut(location.href, 500),
      page_title: cut(document.title, 300),
      landing_url: src.landing_url || first.landing_url,
      referrer: src.referrer,
      click_id: src.click_id,
      ym_client_id: ymId(),
      device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : "desktop",
      first_visit_at: first.at ? new Date(first.at).toISOString() : undefined
    };
    UTM.forEach(function (k) { if (src[k]) a[k] = src[k]; });
    return a;
  };

  var labelOf = function (el) {
    var l = "";
    try { if (el.labels && el.labels[0]) l = el.labels[0].textContent; } catch (e) {}
    if (!l && el.id) {
      var lb = document.querySelector('label[for="' + el.id.replace(/"/g, "") + '"]');
      if (lb) l = lb.textContent;
    }
    l = l || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("data-name") || el.getAttribute("title") || "";
    return l.replace(/\s+/g, " ").replace(/\*/g, "").trim().slice(0, 150);
  };

  var collect = function (root) {
    var out = [];
    var els = root.querySelectorAll("input, textarea, select");
    for (var i = 0; i < els.length && out.length < 60; i++) {
      var el = els[i];
      var type = (el.type || el.tagName).toLowerCase();
      if (el.disabled || type === "submit" || type === "button" || type === "reset" || type === "image" || type === "file" || type === "password") continue;
      if ((type === "checkbox" || type === "radio") && !el.checked) continue;
      var value = el.tagName === "SELECT" ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value) : el.value;
      if (!value || !String(value).trim()) continue;
      out.push({
        name: el.name || el.id || "",
        label: labelOf(el),
        type: el.tagName === "TEXTAREA" ? "textarea" : type,
        value: String(value).slice(0, 3000)
      });
    }
    return out;
  };

  var hasContact = function (fields) {
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === "tel" || f.type === "email") return true;
      if (/@/.test(f.value) || String(f.value).replace(/\D/g, "").length >= 10) return true;
    }
    return false;
  };

  var formName = function (root) {
    var n = root.getAttribute("name") || root.getAttribute("data-tilda-formname") || root.getAttribute("aria-label") || root.id || "";
    if (!n) {
      var h = root.querySelector("h1, h2, h3, h4, legend, .t-title, .form-title");
      if (h) n = h.textContent;
    }
    return n.replace(/\s+/g, " ").trim().slice(0, 120);
  };

  var sent = {};
  var send = function (root) {
    var fields = collect(root);
    if (!fields.length || !hasContact(fields)) return;
    var sig = fields.map(function (f) { return f.name + "=" + f.value; }).join("&");
    if (sent[sig] && Date.now() - sent[sig] < 5000) return;
    sent[sig] = Date.now();
    var hp = root.querySelector('input[name="website"], input[name="url_hp"], input[tabindex="-1"][autocomplete="off"]');
    var payload = JSON.stringify({ t: token, n: formName(root), f: fields, a: attribution(), hp: hp && hp.value ? 1 : 0 });
    var ok = false;
    try {
      if (navigator.sendBeacon) ok = navigator.sendBeacon(API, new Blob([payload], { type: "text/plain" }));
    } catch (e) {}
    if (!ok) {
      try { fetch(API, { method: "POST", body: payload, keepalive: true, mode: "no-cors", headers: { "Content-Type": "text/plain" } }); } catch (e) {}
    }
  };

  var containerOf = function (el) {
    var f = el.closest("form");
    if (f) return f;
    var n = el.parentElement;
    for (var i = 0; n && i < 6; i++, n = n.parentElement) {
      if (n.querySelector('input[type="tel"], input[type="email"], input[name*="phone" i], input[name*="tel" i]')) return n;
    }
    return null;
  };

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f && f.tagName === "FORM") send(f);
  }, true);

  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button, input[type="submit"], [type="submit"], .t-submit, [role="button"]') : null;
    if (!b) return;
    var type = (b.getAttribute("type") || "").toLowerCase();
    if (type === "reset" || type === "button" && !b.className.match(/submit|send|order|btn/i)) return;
    var root = containerOf(b);
    if (!root) return;
    if (root.tagName === "FORM" && root.checkValidity && !root.checkValidity()) return;
    setTimeout(function () { send(root); }, 0);
  }, true);

  capture();
})();
