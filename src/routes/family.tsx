import { createFileRoute } from "@tanstack/react-router";
import Family, { SEO } from "@/pages/Family";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/family")({
  // Кабинет близких: вход хранится в localStorage — только в браузере.
  ssr: false,
  head: () => seoHead(SEO),
  // Пока страница грузится в браузере — тот же пустой фон, что был у Suspense в App.tsx.
  pendingComponent: Shell,
  component: Family,
});

function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="sr-only">Кабинет для родственников зависимых — addict.clinic</h1>
    </div>
  );
}
