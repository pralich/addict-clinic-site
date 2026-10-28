import { createFileRoute } from "@tanstack/react-router";
import Admin, { SEO } from "@/pages/Admin";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  // CRM: вход хранится в localStorage — страница рендерится только в браузере.
  ssr: false,
  head: () => seoHead(SEO),
  // Пока страница грузится в браузере — тот же пустой фон, что был у Suspense в App.tsx.
  pendingComponent: Shell,
  component: Admin,
});

function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="sr-only">CRM — addict.clinic. Панель управления</h1>
    </div>
  );
}
