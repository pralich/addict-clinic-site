import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { captureAttribution } from './lib/attribution'

captureAttribution();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (location.pathname.startsWith("/admin")) {
      navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => null);
    } else {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
  });
}