import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { useAuth } from "../AuthContext";
import { fmtDate } from "../config";
import { useBillingReload } from "../billing/shared";

export type TaskFile = { id: number; name: string; url: string; size: number; content_type: string | null; created_at: string; user_id: number | null; user_name: string | null };

const MAX = 20 * 1024 * 1024;

const toBase64 = (f: Blob) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

const CHUNK = 2 * 1024 * 1024;

export const uploadTaskFile = async (taskId: number, f: File) => {
  const meta = { name: f.name, contentType: f.type };
  if (f.size <= CHUNK) return api({ resource: "tasks", action: "files", id: taskId }, "POST", { ...meta, file: await toBase64(f) });
  const upload_id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const parts = Math.ceil(f.size / CHUNK);
  for (let i = 0; i < parts; i++) {
    await api({ resource: "tasks", action: "file_chunk", id: taskId }, "POST", { upload_id, index: i, file: await toBase64(f.slice(i * CHUNK, (i + 1) * CHUNK)) });
  }
  return api({ resource: "tasks", action: "files", id: taskId }, "POST", { ...meta, upload_id, parts });
};

const size = (n: number) => (n < 1024 ? `${n} Б` : n < 1048576 ? `${Math.round(n / 1024)} КБ` : `${(n / 1048576).toFixed(1).replace(".", ",")} МБ`);

const iconFor = (f: TaskFile) => {
  const t = f.content_type || "";
  const ext = f.name.split(".").pop()?.toLowerCase() || "";
  if (t.startsWith("image/")) return "Image";
  if (t.includes("pdf") || ext === "pdf") return "FileText";
  if (["xls", "xlsx", "csv"].includes(ext)) return "FileSpreadsheet";
  if (["doc", "docx", "rtf", "txt", "odt"].includes(ext)) return "FileType";
  if (["zip", "rar", "7z"].includes(ext)) return "FileArchive";
  if (t.startsWith("audio/")) return "FileAudio";
  if (t.startsWith("video/")) return "FileVideo";
  return "File";
};

const TaskFiles = ({ taskId, authorId }: { taskId: number; authorId?: number | null }) => {
  const { user } = useAuth();
  const reload = useBillingReload();
  const { data } = useQuery<{ files?: TaskFile[] }>({ queryKey: ["crm", "tasks", "item", taskId], queryFn: () => api({ resource: "tasks", id: taskId }) });
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const files = data?.files ?? [];

  const upload = async (list: FileList | File[] | null) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    for (const f of arr) {
      if (f.size > MAX) { toast.error(`«${f.name}» больше 20 МБ`); continue; }
      setUploading((u) => [...u, f.name]);
      try {
        await uploadTaskFile(taskId, f);
      } catch (e) {
        toast.error(`«${f.name}»: ${(e as Error).message}`);
      } finally {
        setUploading((u) => u.filter((x) => x !== f.name));
      }
    }
    reload();
  };

  const remove = async (f: TaskFile) => {
    if (!confirm(`Удалить файл «${f.name}»?`)) return;
    try {
      await api({ resource: "tasks", action: "files", id: f.id }, "DELETE");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const canDelete = (f: TaskFile) => f.user_id === user?.id || authorId === user?.id || user?.role === "admin";

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
      className={`rounded-2xl transition-colors ${drag ? "bg-primary/5 ring-2 ring-primary/40" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Icon name="Paperclip" size={16} className="text-muted-foreground" />Файлы{files.length ? ` · ${files.length}` : ""}</p>
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading.length > 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-medium hover:bg-secondary/70 disabled:opacity-60">
          <Icon name={uploading.length ? "Loader2" : "Upload"} size={13} className={uploading.length ? "animate-spin" : ""} />Прикрепить
        </button>
        <input ref={ref} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length === 0 && !uploading.length ? (
        <button type="button" onClick={() => ref.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-sm text-muted-foreground hover:bg-secondary/40">
          <Icon name="FilePlus" size={16} />Перетащите файлы сюда или нажмите, до 20 МБ
        </button>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {files.map((f) => {
            const img = (f.content_type || "").startsWith("image/");
            return (
              <li key={f.id} className="group flex items-center gap-3 rounded-xl border bg-card p-2">
                <a href={f.url} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                  {img ? <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name={iconFor(f)} size={18} className="text-muted-foreground" />}
                </a>
                <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium hover:underline">{f.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{size(f.size)} · {f.user_name || "—"} · {fmtDate(f.created_at, true)}</p>
                </a>
                <a href={f.url} download={f.name} target="_blank" rel="noreferrer" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Скачать"><Icon name="Download" size={15} /></a>
                {canDelete(f) && (
                  <button type="button" onClick={() => remove(f)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Удалить"><Icon name="Trash2" size={15} /></button>
                )}
              </li>
            );
          })}
          {uploading.map((n) => (
            <li key={n} className="flex items-center gap-3 rounded-xl border border-dashed p-2 text-sm text-muted-foreground">
              <span className="flex h-10 w-10 items-center justify-center"><Icon name="Loader2" size={18} className="animate-spin" /></span>
              <span className="truncate">Загружается «{n}»…</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskFiles;
