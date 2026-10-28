import { useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

// Кладёт данные из loader маршрута в кэш react-query до рендера страницы:
// компоненты с useQuery по тому же ключу сразу видят данные (и на сервере).
export const useSeedQuery = <T,>(key: QueryKey, data: T | null | undefined) => {
  const qc = useQueryClient();
  useState(() => {
    if (data != null && qc.getQueryData(key) === undefined) qc.setQueryData(key, data);
    return null;
  });
};
