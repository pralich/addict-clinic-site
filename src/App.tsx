
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InstallPrompt from "@/components/InstallPrompt";
import SiteWidget from "@/components/SiteWidget";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CookieBanner from "@/components/legal/CookieBanner";
import { lazy, Suspense } from "react";

const Admin = lazy(() => import("./pages/Admin"));
const Partner = lazy(() => import("./pages/Partner"));
const Premium = lazy(() => import("./pages/Premium"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const Family = lazy(() => import("./pages/Family"));
const Shop = lazy(() => import("./pages/Shop"));
const Treatments = lazy(() => import("./pages/Treatments"));
const TreatmentPage = lazy(() => import("./pages/TreatmentPage"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const Consent = lazy(() => import("./pages/legal/Consent"));
const Offer = lazy(() => import("./pages/legal/Offer"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const Requisites = lazy(() => import("./pages/legal/Requisites"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InstallPrompt />
        <SiteWidget />
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<ArticlePage />} />
          <Route path="/family" element={<Family />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/lechenie" element={<Treatments />} />
          <Route path="/lechenie/:slug" element={<TreatmentPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/offer" element={<Offer />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/requisites" element={<Requisites />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <CookieBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;