
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InstallPrompt from "@/components/InstallPrompt";
import SiteWidget from "@/components/SiteWidget";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Premium from "./pages/Premium";
import Articles from "./pages/Articles";
import ArticlePage from "./pages/ArticlePage";
import Family from "./pages/Family";
import Shop from "./pages/Shop";
import Treatments from "./pages/Treatments";
import TreatmentPage from "./pages/TreatmentPage";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Consent from "./pages/legal/Consent";
import Offer from "./pages/legal/Offer";
import Cookies from "./pages/legal/Cookies";
import Requisites from "./pages/legal/Requisites";
import CookieBanner from "@/components/legal/CookieBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InstallPrompt />
        <SiteWidget />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
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
        <CookieBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;