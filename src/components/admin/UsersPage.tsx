import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import EntityForm, { type Field } from "./EntityForm";
import { useCrmMutation, useList } from "./useCrm";
import { ROLES, fmtDate, toOptions } from "./config";
import { useAuth } from "./AuthContext";

const baseFields: Field[] = [
  { name: "name", label: "Имя", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Телефон", type: "tel" },
  { name: "role", label: "Роль", type: "select", options: toOptions(ROLES), required: true },
];
const createFields: Field[] = [...baseFields, { name: "password", label: "Пароль (от 6 символов)", type: "password", required: true }];
const editFields: Field[] = [...baseFields, { name: "password", label: "Новый пароль (если меняете)", type: "password" }];

const UsersPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = useList("users");
  const mut = useCrmMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Сотрудники с доступом к панели</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="rounded-full" onClick={() => setCreating(true)}><Icon name="UserPlus" size={14} className="mr-1.5" />Добавить сотрудника</Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-center">Лидов</TableHead>
                <TableHead className="text-center">Сделок</TableHead>
                <TableHead>Последний вход</TableHead>
                <TableHead>Доступ</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm font-semibold">
                        {u.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}{u.id === user?.id && <span className="ml-1.5 text-xs text-muted-foreground">(вы)</span>}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{ROLES[u.role] || u.role}</TableCell>
                  <TableCell className="text-center">{u.leads_count}</TableCell>
                  <TableCell className="text-center">{u.deals_count}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(u.last_login_at, true)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      disabled={!isAdmin || u.id === user?.id}
                      onCheckedChange={(c) => mut.mutate({ params: { resource: "users", id: u.id }, method: "PUT", body: { is_active: c } })}
                    />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(u)}><Icon name="Pencil" size={14} /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Загрузка…</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EntityForm open={creating} onOpenChange={setCreating} title="Новый сотрудник" fields={createFields} initial={{ role: "manager" }}
        onSubmit={(body) => mut.mutateAsync({ params: { resource: "users" }, method: "POST", body }).then(() => toast.success("Сотрудник добавлен"))} />
      <EntityForm open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title="Редактировать сотрудника" fields={editFields} initial={editing || undefined}
        onSubmit={(body) => mut.mutateAsync({ params: { resource: "users", id: editing.id }, method: "PUT", body }).then(() => toast.success("Сохранено"))} />
    </div>
  );
};

export default UsersPage;
