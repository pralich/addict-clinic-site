import { createFileRoute } from "@tanstack/react-router";
import Partner, { SEO } from "@/pages/Partner";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/partner")({
  // Кабинет партнёра: вход хранится в localStorage — только в браузере.
  ssr: false,
  head: () => seoHead(SEO),
  // Пока страница грузится в браузере — тот же пустой фон, что был у Suspense в App.tsx.
  pendingComponent: Shell,
  component: Partner,
});

function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="sr-only">Кабинет партнёра — addict.clinic</h1>
    </div>
  );
}
