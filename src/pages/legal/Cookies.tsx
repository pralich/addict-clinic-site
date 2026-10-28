import LegalLayout from "@/components/legal/LegalLayout";
import { ORG } from "@/lib/legal";
import { openCookieSettings } from "@/lib/cookie-consent";
import type { Seo } from "@/lib/seo";
import { clinicNode, graph, logoNode, ORG_ID, orgNode, websiteNode, webPage } from "@/lib/schema";

export const SEO: Seo = { title: "Политика cookie — addict.clinic", description: "Какие cookie использует сайт addict.clinic и как управлять согласием на аналитику.", path: "/cookies" , jsonLd: graph(clinicNode, logoNode, websiteNode, orgNode, webPage({ type: "WebPage", path: "/cookies", name: "Политика cookie", crumbs: [["Политика cookie", "/cookies"]], extra: { about: { "@id": ORG_ID } } })) };

const Cookies = () => {
  return (
    <LegalLayout
      title="Политика использования cookie"
      lead={
        <>
          Базовая статистика «Яндекс Метрики» работает всегда, дополнительная аналитика — только с вашего согласия. Изменить выбор можно в любой момент:{" "}
          <button onClick={openCookieSettings} className="font-medium underline underline-offset-2 hover:text-primary">открыть настройки cookie</button>.
        </>
      }
    >
      <h2>1. Что такое cookie</h2>
      <p>Cookie и похожие технологии, например localStorage, — это небольшие записи, которые сайт сохраняет в вашем браузере. С их помощью сайт запоминает корзину, вход в кабинет и ваш выбор настроек.</p>

      <h2>2. Какие cookie мы используем</h2>
      <table>
        <thead>
          <tr><th>Категория</th><th>Зачем</th><th>Согласие</th><th>Срок</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Необходимые</td>
            <td>Корзина магазина, вход в кабинет для близких и CRM, запоминание выбора по cookie, работа сайта как приложения и уведомлений</td>
            <td>Не требуется — без них сайт не работает</td>
            <td>До выхода из кабинета или очистки браузера</td>
          </tr>
          <tr>
            <td>Статистика сайта</td>
            <td>«Яндекс Метрика» (ООО «Яндекс»): обезличенная статистика посещений, карта кликов, запись действий на странице («Вебвизор») и учёт обращений (заявки, звонки, переходы в мессенджеры) — чтобы улучшать сайт и понимать, какие страницы помогают людям обратиться за помощью. Содержимое полей форм не записывается</td>
            <td>Работают всегда — используются для работы и улучшения сайта</td>
            <td>До 1 года</td>
          </tr>
          <tr>
            <td>Дополнительная аналитика</td>
            <td>Другие счётчики посещаемости, если они подключены (Google Analytics, Top.Mail.Ru, пиксель VK)</td>
            <td>Только после нажатия «Принять все»</td>
            <td>До 1 года</td>
          </tr>
        </tbody>
      </table>
      <p>Мы не используем рекламные cookie и не передаём данные рекламным сетям.</p>

      <h2>3. Как управлять cookie</h2>
      <ul>
        <li>Нажмите «Настройки cookie» в подвале сайта и включите или выключите дополнительную аналитику.</li>
        <li>Удалите cookie или запретите их в настройках браузера. После этого может перестать работать вход в кабинет и корзина.</li>
        <li>Отказаться от «Яндекс Метрики» на всех сайтах можно с помощью официального блокировщика Яндекса.</li>
      </ul>

      <h2>4. Контакты</h2>
      <p>Вопросы об обработке данных направляйте на <a href={`mailto:${ORG.email}`}>{ORG.email}</a>. Подробнее — в <a href="/privacy">Политике обработки персональных данных</a>.</p>
    </LegalLayout>
  );
};

export default Cookies;