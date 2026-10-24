type Params = Record<string, unknown>;
type YmFn = (...args: unknown[]) => void;
type GoalWindow = Window & { ym?: YmFn; __ymId?: number };

export const GOALS = [
  { id: "lead", title: "Любая заявка с сайта", hint: "Все формы: главная, PREMIUM, страницы лечения, статьи" },
  { id: "lead_contacts", title: "Заявка — форма «Контакты»", hint: "Главная страница" },
  { id: "lead_premium", title: "Заявка — PREMIUM", hint: "Страница /premium" },
  { id: "lead_treatment", title: "Заявка — страница лечения", hint: "/lechenie/…" },
  { id: "lead_service", title: "Заявка — страница услуги", hint: "/uslugi/…" },
  { id: "lead_article", title: "Заявка — форма в статье", hint: "/articles/…" },
  { id: "phone_click", title: "Клик по телефону", hint: "Любая ссылка tel:" },
  { id: "messenger_click", title: "Клик по любому мессенджеру", hint: "WhatsApp, Telegram, MAX" },
  { id: "whatsapp_click", title: "Клик по WhatsApp", hint: "" },
  { id: "telegram_click", title: "Клик по Telegram", hint: "" },
  { id: "max_click", title: "Клик по MAX", hint: "" },
  { id: "email_click", title: "Клик по email", hint: "Любая ссылка mailto:" },
  { id: "contact_any", title: "Любой контакт (составная)", hint: "Заявка, звонок, мессенджер или email" },
  { id: "cart_add", title: "Добавление в корзину", hint: "Магазин" },
  { id: "checkout_start", title: "Переход к оформлению", hint: "Магазин" },
  { id: "checkout_submit", title: "Отправка заказа на оплату", hint: "Магазин" },
  { id: "purchase", title: "Оплаченный заказ", hint: "Магазин, с суммой заказа" },
  { id: "family_register", title: "Регистрация в кабинете близких", hint: "/family" },
  { id: "family_login", title: "Вход в кабинет близких", hint: "/family" },
  { id: "family_pay", title: "Переход к оплате в кабинете", hint: "/family" },
  { id: "family_paid", title: "Оплата в кабинете близких", hint: "/family, с суммой" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];

const queue: [GoalId, Params | undefined][] = [];

export const flushGoals = () => {
  const w = window as GoalWindow;
  if (!w.ym || !w.__ymId) return;
  while (queue.length) {
    const [g, p] = queue.shift()!;
    w.ym(w.__ymId, "reachGoal", g, p);
  }
};

export const reachGoal = (goal: GoalId, params?: Params) => {
  if (/^\/(admin|partner)/.test(location.pathname)) return;
  queue.push([goal, params]);
  flushGoals();
};

export const reachGoalOnce = (key: string, goal: GoalId, params?: Params) => {
  const k = `goal_${goal}_${key}`;
  try {
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch {
    /* без хранилища — отправим как есть */
  }
  reachGoal(goal, params);
};

const leadGoal = (form: string): GoalId | null => {
  if (form === "contacts") return "lead_contacts";
  if (form === "premium") return "lead_premium";
  if (form === "article_cta") return "lead_article";
  if (form.startsWith("treatment_")) return "lead_treatment";
  if (form.startsWith("service_")) return "lead_service";
  return null;
};

export const reachLeadGoal = (form: string) => {
  const params = { form, page: location.pathname };
  reachGoal("lead", params);
  const sub = leadGoal(form);
  if (sub) reachGoal(sub, params);
  reachGoal("contact_any", { type: "form" });
};

let clicksBound = false;
export const initGoalClicks = () => {
  if (clicksBound || /^\/(admin|partner)/.test(location.pathname)) return;
  clicksBound = true;
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement)?.closest?.("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const params = { page: location.pathname };
    if (href.startsWith("tel:")) {
      reachGoal("phone_click", params);
      reachGoal("contact_any", { type: "phone" });
    } else if (href.startsWith("mailto:")) {
      reachGoal("email_click", params);
      reachGoal("contact_any", { type: "email" });
    } else {
      const m: GoalId | null = /wa\.me|whatsapp/i.test(href) ? "whatsapp_click" : /t\.me|telegram/i.test(href) ? "telegram_click" : /max\.ru/i.test(href) ? "max_click" : null;
      if (!m) return;
      reachGoal(m, params);
      reachGoal("messenger_click", { ...params, messenger: m.replace("_click", "") });
      reachGoal("contact_any", { type: "messenger" });
    }
  }, true);
};
