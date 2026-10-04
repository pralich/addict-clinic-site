import { toast } from "sonner";
import LegalLayout from "@/components/legal/LegalLayout";
import Icon from "@/components/ui/icon";
import { ORG } from "@/lib/legal";
import { useSeo } from "@/lib/seo";

const ROWS: [string, string][] = [
  ["Полное наименование", ORG.fullName],
  ["Сокращённое наименование", ORG.shortName],
  ["ИНН", ORG.inn],
  ["КПП", ORG.kpp],
  ["ОГРН", ORG.ogrn],
  ["Юридический адрес", ORG.legalAddress],
  ["Почтовый адрес", ORG.postAddress],
  ["Email", ORG.email],
  ["Банк", ORG.bank],
  ["БИК", ORG.bik],
  ["Расчётный счёт", ORG.account],
  ["Корреспондентский счёт", ORG.corrAccount],
  [ORG.directorPosition, ORG.director],
];

const Requisites = () => {
  useSeo({ title: "Реквизиты — addict.clinic", description: `Реквизиты оператора сайта ${ORG.site}: ${ORG.fullName}, ИНН ${ORG.inn}, ОГРН ${ORG.ogrn}.`, path: "/requisites" });
  const copyAll = () => {
    navigator.clipboard.writeText(ROWS.map(([k, v]) => `${k}: ${v}`).join("\n")).then(() => toast.success("Реквизиты скопированы"));
  };
  return (
    <LegalLayout title="Реквизиты" lead={<>Сайт {ORG.site} принадлежит организации, указанной ниже. Она отвечает за обработку персональных данных и выступает продавцом по <a href="/offer" className="underline underline-offset-2">публичной оферте</a>.</>}>
      <table>
        <tbody>
          {ROWS.map(([k, v]) => (
            <tr key={k}>
              <th className="w-[38%]">{k}</th>
              <td>{k === "Email" ? <a href={`mailto:${v}`}>{v}</a> : v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={copyAll} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 print:hidden">
        <Icon name="Copy" size={15} />Скопировать реквизиты
      </button>
    </LegalLayout>
  );
};

export default Requisites;
