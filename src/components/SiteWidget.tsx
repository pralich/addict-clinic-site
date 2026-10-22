import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SRC = "https://xn--b1aeggcy5bi.xn--p1ai/w.js";
const TOKEN = "wg_0b64aa04c7526147b140453b";
const isPrivate = (path: string) => /^\/(admin|partner)(\/|$)/.test(path);

const SiteWidget = () => {
  const { pathname } = useLocation();
  const priv = isPrivate(pathname);

  useEffect(() => {
    const loaded = document.querySelector(`script[src="${SRC}"]`);
    if (priv) {
      if (loaded) window.location.reload();
      return;
    }
    if (loaded) return;
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.dataset.token = TOKEN;
    document.head.appendChild(s);
  }, [priv]);

  return null;
};

export default SiteWidget;
