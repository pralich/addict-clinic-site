import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/crm-api";
import { toast } from "sonner";

export type Option = { id: number; name: string };
export type Tag = { id: number; grp: string; name: string; color: string; sort: number; is_active: boolean };
export type Options = {
  users: Option[];
  partners: Option[];
  clients: Option[];
  tags: Tag[];
  counterparties: (Option & { inn?: string | null })[];
  deals: (Option & { client_id: number | null; partner_id: number | null })[];
};

export const useOptions = () =>
  useQuery<Options>({ queryKey: ["crm", "options"], queryFn: () => api({ resource: "options" }), staleTime: 30000 });

export const useList = (resource: string, params: Record<string, string | undefined> = {}) =>
  useQuery<{ items: any[] }>({
    queryKey: ["crm", resource, "list", params],
    queryFn: () => api({ resource, ...params }),
  });

export const useItem = (resource: string, id: number | null) =>
  useQuery<{ item: any; activities: any[]; related: Record<string, any[]>; refs?: Record<string, any> }>({
    queryKey: ["crm", resource, "item", id],
    queryFn: () => api({ resource, id: id! }),
    enabled: !!id,
  });

export const useCrmMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { params: Record<string, any>; method: string; body?: unknown }) => api(v.params, v.method, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
    onError: (e: Error) => toast.error(e.message),
  });
};
