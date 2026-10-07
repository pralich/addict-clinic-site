import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import func2url from "../../../backend/func2url.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { useAuth } from "./AuthContext";
import { fmtDate } from "./config";

const API_URL = (func2url as Record<string, string>)["crm-api"];

type ApiKey = { id: number; name: string; key_prefix: string; is_active: boolean; requests_count: number; last_used_at: string | null; created_at: string; revoked_at: string | null; author: string | null };

type Field = [string, string, string];

const DOCS: { id: string; title: string; required: string; fields: Field[]; example: object; note: string }[] = [
  {
    id: "leads",
    title: "Лиды",
    required: "contact, phone или email",
    note: "Новый лид сразу появляется в CRM, менеджерам приходит push-уведомление. Метки utm_* и page_url добавляются в текст сообщения.",
    fields: [
      ["name", "строка", "Имя"],
      ["contact / phone / email", "строка", "Хотя бы одно из трёх"],
      ["topic", "строка", "Тема обращения"],
      ["message", "строка", "Комментарий"],
      ["source", "site, phone, partner, referral, ads, api, other", "По умолчанию api"],
      ["status", "new, in_work, qualified, converted, rejected", "По умолчанию new"],
      ["manager_id, partner_id, client_id", "число", "Связи с записями CRM"],
      ["utm_source … utm_term, page_url", "строка", "Метки рекламы"],
      ["external_id", "строка", "Ваш ID — защищает от дублей"],
    ],
    example: { name: "Иван", phone: "+7 999 123-45-67", topic: "Вывод из запоя", message: "Нужен врач на дом", source: "ads", utm_source: "yandex", external_id: "form-1024" },
  },
  {
    id: "clients",
    title: "Клиенты",
    required: "full_name, phone или email",
    note: "Если клиент с таким external_id, телефоном или email уже есть — вернётся существующий (created: false). Чтобы создать дубль, передайте deduplicate: false.",
    fields: [
      ["full_name", "строка", "ФИО"],
      ["phone", "строка", "Приводится к формату +7XXXXXXXXXX"],
      ["email", "строка", "Email"],
      ["birth_date", "ГГГГ-ММ-ДД", "Дата рождения"],
      ["is_anonymous", "true / false", "Анонимный клиент"],
      ["source", "site, phone, partner, referral, ads, api, other", "По умолчанию api"],
      ["status", "active, treatment, rehab, finished, inactive", "По умолчанию active"],
      ["manager_id, partner_id", "число", "Ответственный и партнёр"],
      ["notes", "строка", "Заметки"],
      ["external_id", "строка", "Ваш ID"],
    ],
    example: { full_name: "Петров Иван Сергеевич", phone: "89991234567", email: "ivan@example.ru", status: "active", external_id: "1c-00042" },
  },
  {
    id: "deals",
    title: "Сделки",
    required: "title",
    note: "Клиента можно передать сразу внутри сделки в поле client — он найдётся или создастся автоматически.",
    fields: [
      ["title", "строка", "Название сделки"],
      ["client_id", "число", "ID существующего клиента"],
      ["client", "объект", "Или данные клиента: full_name, phone, email"],
      ["stage", "new, consult, diagnostics, offer, treatment, won, lost", "По умолчанию new"],
      ["program", "строка", "Программа лечения"],
      ["amount", "число", "Сумма, ₽"],
      ["expected_close", "ГГГГ-ММ-ДД", "Плановая дата закрытия"],
      ["manager_id, partner_id, lead_id", "число", "Связи"],
      ["notes", "строка", "Заметки"],
      ["external_id", "строка", "Ваш ID"],
    ],
    example: { title: "Реабилитация 28 дней", amount: 180000, stage: "offer", program: "Стационар", client: { full_name: "Петров Иван", phone: "+79991234567" }, external_id: "deal-77" },
  },
];

const copy = (text: string, msg = "Скопировано") => {
  navigator.clipboard.writeText(text);
  toast.success(msg);
};

const Code = ({ children }: { children: string }) => (
  <div className="group relative">
    <pre className="overflow-x-auto rounded-lg bg-night p-4 text-[12px] leading-relaxed text-night-foreground"><code>{children}</code></pre>
    <button onClick={() => copy(children)} className="absolute right-2 top-2 rounded-md bg-white/10 p-1.5 text-white opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" aria-label="Копировать">
      <Icon name="Copy" size={13} />
    </button>
  </div>
);

const ApiPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const { data } = useQuery<{ items: ApiKey[] }>({ queryKey: ["crm", "api_keys"], queryFn: () => api({ resource: "api_keys" }), enabled: isAdmin });

  const create = useMutation({
    mutationFn: () => api<{ key: string }>({ resource: "api_keys" }, "POST", { name }),
    onSuccess: (r) => { setNewKey(r.key); setName(""); qc.invalidateQueries({ queryKey: ["crm", "api_keys"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api({ resource: "api_keys", id }, "DELETE"),
    onSuccess: () => { toast.success("Ключ отозван"); qc.invalidateQueries({ queryKey: ["crm", "api_keys"] }); },
  });

  const keys = (data?.items ?? []).filter((k) => k.key_prefix !== "ac_test_");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">API</h1>
        <p className="text-sm text-muted-foreground">Передача лидов, клиентов и сделок в CRM из сайтов, рекламы, телефонии и 1С</p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Адрес API</p>
        <button onClick={() => copy(API_URL, "Адрес скопирован")} className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2.5 text-left font-mono text-xs hover:bg-secondary/70 md:text-sm">
          <span className="truncate">{API_URL}</span>
          <Icon name="Copy" size={14} className="shrink-0 text-muted-foreground" />
        </button>
        <p className="mt-3 text-sm text-muted-foreground">
          Ключ передаётся в заголовке <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">X-Api-Key</code>. Данные — методом POST в формате JSON. Ответ <b className="text-foreground">201</b> — запись создана, <b className="text-foreground">200</b> — найдена существующая, <b className="text-foreground">400</b> — ошибка в данных (в ответе указано поле), <b className="text-foreground">401</b> — неверный ключ.
        </p>
      </div>

      {isAdmin ? (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon name="KeyRound" size={19} /></span>
            <div>
              <p className="font-heading font-semibold">API-ключи</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Отдельный ключ для каждой интеграции — так проще отключить одну, не трогая остальные.</p>
            </div>
          </div>

          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название, например «Тильда — лендинг» или «Телефония»" className="flex-1" />
            <Button type="submit" className="rounded-full" disabled={!name.trim() || create.isPending}>
              <Icon name="Plus" size={15} className="mr-1.5" />Создать ключ
            </Button>
          </form>

          {newKey && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900"><Icon name="TriangleAlert" size={16} />Скопируйте ключ сейчас — он показывается только один раз</p>
              <button onClick={() => copy(newKey, "Ключ скопирован")} className="mt-2 flex w-full items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-left font-mono text-xs text-foreground md:text-sm">
                <span className="break-all">{newKey}</span>
                <Icon name="Copy" size={14} className="shrink-0" />
              </button>
              <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-amber-900 underline">Я сохранил ключ</button>
            </div>
          )}

          <div className="mt-4 divide-y rounded-lg border">
            {keys.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Ключей пока нет</p>}
            {keys.map((k) => (
              <div key={k.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 text-sm ${k.is_active ? "" : "opacity-50"}`}>
                <Icon name={k.is_active ? "KeyRound" : "KeySquare"} size={16} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{k.key_prefix}…</span> · создан {fmtDate(k.created_at)}{k.author ? `, ${k.author}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{k.requests_count} запросов</p>
                  <p>{k.last_used_at ? `последний ${fmtDate(k.last_used_at, true)}` : "не использовался"}</p>
                </div>
                {k.is_active ? (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => confirm(`Отозвать ключ «${k.name}»? Интеграция перестанет работать.`) && revoke.mutate(k.id)}>Отозвать</Button>
                ) : (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs">Отозван {fmtDate(k.revoked_at)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Ключи API создаёт администратор. Документация ниже доступна всем.</p>
      )}

      <div className="rounded-xl border bg-card p-5">
        <p className="font-heading font-semibold">Документация</p>
        <Tabs defaultValue="leads" className="mt-3">
          <TabsList>
            {DOCS.map((d) => <TabsTrigger key={d.id} value={d.id}>{d.title}</TabsTrigger>)}
          </TabsList>
          {DOCS.map((d) => {
            const curl = `curl -X POST "${API_URL}?resource=${d.id}" \\\n  -H "X-Api-Key: ВАШ_КЛЮЧ" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(d.example)}'`;
            return (
              <TabsContent key={d.id} value={d.id} className="mt-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800">POST</span>
                  <code className="font-mono text-xs">?resource={d.id}</code>
                  <span className="text-muted-foreground">· обязательно: {d.required}</span>
                </div>
                <p className="text-sm text-muted-foreground">{d.note}</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                      <tr><th className="px-3 py-2 font-medium">Поле</th><th className="px-3 py-2 font-medium">Значения</th><th className="px-3 py-2 font-medium">Описание</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {d.fields.map(([f, v, desc]) => (
                        <tr key={f}><td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{f}</td><td className="px-3 py-2 text-xs text-muted-foreground">{v}</td><td className="px-3 py-2">{desc}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Code>{curl}</Code>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-sky-100 px-2 py-0.5 font-mono text-xs font-semibold text-sky-800">GET</span>
                  <code className="font-mono text-xs">?resource={d.id}&id=123</code>
                  <span className="text-muted-foreground">или</span>
                  <code className="font-mono text-xs">&external_id=…</code>
                  <span className="text-muted-foreground">— получить запись</span>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
          <span><code className="font-mono text-xs text-foreground">GET ?resource=ping</code> — проверить ключ</span>
          <span><code className="font-mono text-xs text-foreground">GET ?resource=dictionaries</code> — списки статусов и этапов</span>
        </div>
      </div>
    </div>
  );
};

export default ApiPage;
