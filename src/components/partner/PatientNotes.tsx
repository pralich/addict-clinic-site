import { CONDITIONS, type PatientNote } from "@/lib/partner-api";
import Icon from "@/components/ui/icon";
import { Badge, dt } from "./ui";

const PatientNotes = ({ notes }: { notes: PatientNote[] }) =>
  !notes.length ? (
    <p className="text-sm text-muted-foreground">Записей пока нет</p>
  ) : (
    <ul className="flex flex-col gap-2">
      {notes.map((n) => (
        <li key={n.id} className={`rounded-xl p-3 text-sm ${n.from_clinic ? "border border-primary/20 bg-primary/5" : n.kind === "status" ? "bg-secondary/40" : "bg-secondary/70"}`}>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {n.from_clinic && <span className="flex items-center gap-1 font-medium text-primary"><Icon name="Building" size={12} />addict.clinic</span>}
            <span>{dt(n.created_at)}{n.author ? ` · ${n.author}` : ""}</span>
            <Badge map={CONDITIONS} value={n.condition} />
          </div>
          <p className="whitespace-pre-line">{n.text}</p>
        </li>
      ))}
    </ul>
  );

export default PatientNotes;
