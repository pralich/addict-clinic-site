import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOptions, type Options } from "./useCrm";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "switch" | "ref" | "password";
  options?: { value: string; label: string }[];
  ref?: keyof Options;
  required?: boolean;
  full?: boolean;
  placeholder?: string;
  section?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  fields: Field[];
  initial?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<unknown>;
};

const NONE = "__none";

const EntityForm = ({ open, onOpenChange, title, fields, initial, onSubmit }: Props) => {
  const { data: opts } = useOptions();
  const [data, setData] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const d: Record<string, any> = {};
      fields.forEach((f) => {
        const v = initial?.[f.name];
        d[f.name] = f.type === "date" && v ? String(v).slice(0, 10) : v ?? (f.type === "switch" ? false : "");
      });
      setData(d);
    }
  }, [open, initial, fields]);

  const set = (k: string, v: any) => setData((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const out: Record<string, any> = {};
      fields.forEach((f) => {
        const v = data[f.name];
        if (f.type === "password" && !v) return;
        out[f.name] = v === "" ? null : v;
      });
      await onSubmit(out);
      onOpenChange(false);
    } catch {
      /* toast shown in mutation */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const v = data[f.name];
            const full = f.full || f.type === "textarea";
            let control;
            if (f.type === "textarea") {
              control = <Textarea rows={3} value={v ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />;
            } else if (f.type === "switch") {
              control = (
                <div className="flex h-10 items-center">
                  <Switch checked={!!v} onCheckedChange={(c) => set(f.name, c)} />
                </div>
              );
            } else if (f.type === "select" || f.type === "ref") {
              const items = f.type === "ref" ? (opts?.[f.ref!] || []).map((o) => ({ value: String(o.id), label: o.name })) : f.options || [];
              control = (
                <Select value={v === null || v === "" || v === undefined ? NONE : String(v)} onValueChange={(nv) => set(f.name, nv === NONE ? "" : nv)}>
                  <SelectTrigger><SelectValue placeholder="Не выбрано" /></SelectTrigger>
                  <SelectContent>
                    {!f.required && <SelectItem value={NONE}>Не выбрано</SelectItem>}
                    {items.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              );
            } else {
              control = (
                <Input
                  type={f.type || "text"}
                  value={v ?? ""}
                  required={f.required}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              );
            }
            const prev = fields[fields.indexOf(f) - 1];
            const heading = f.section && f.section !== prev?.section ? (
              <div className="-mb-1 mt-2 flex items-center gap-2 border-t pt-4 sm:col-span-2">
                <span className="font-heading text-sm font-semibold">{f.section}</span>
              </div>
            ) : null;
            return (
              <div key={f.name} className="contents">
              {heading}
              <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}>
                <span className="mb-1.5 block font-medium">
                  {f.label}
                  {f.required && <span className="text-primary"> *</span>}
                </span>
                {control}
              </label>
              </div>
            );
          })}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EntityForm;
