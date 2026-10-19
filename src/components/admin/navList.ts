import { useSyncExternalStore } from "react";

type NavList = { resource: string; ids: number[] };

let state: NavList = { resource: "", ids: [] };
const subs = new Set<() => void>();

export const setNavList = (resource: string, ids: number[]) => {
  if (state.resource === resource && state.ids.length === ids.length && state.ids.every((v, i) => v === ids[i])) return;
  state = { resource, ids };
  subs.forEach((f) => f());
};

export const clearNavList = (resource: string) => {
  if (state.resource === resource) setNavList("", []);
};

export const useNavList = () =>
  useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => state,
  );
