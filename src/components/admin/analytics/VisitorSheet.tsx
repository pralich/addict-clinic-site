import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/crm-api";
import VisitCard from "./VisitCard";
import { dur, type Visit } from "./types";

type Props = { visitor: string; onClose: () => void; onOpen: (resource: string, id: number) => void };

const VisitorSheet = ({ visitor, onClose, onOpen }: Props) => {
  const { data, isLoading } = useQuery<{ items: Visit[] }>({
    queryKey: ["crm", "analytics", "visitor", visitor],
    queryFn: () => api({ resource: "analytics", visitor }),
  });
  const items = data?.items || [];
  const total = items.reduce((s, v) => s + (v.active_seconds || 0), 0);
  const lead = items.find((v) => v.lead_id);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">История посетителя</p>
          <SheetTitle>{lead ? lead.lead_name || lead.lead_contact || "Лид" : `Посетитель #${visitor.slice(0, 6)}`}</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="flex justify-center py-10"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.length} визитов · {items.reduce((s, v) => s + v.pages.length, 0)} страниц · {dur(total)} на сайте
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {items.map((v) => <VisitCard key={v.id} v={v} live={false} onVisitor={() => null} onOpen={onOpen} />)}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default VisitorSheet;
