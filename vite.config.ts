import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {componentTagger} from "pp-tagger";

// HMR-сокет превью рвёт инфраструктура: ingress-nginx на каждом reload
// конфига (захват/освобождение любого dev-пода) через 30 с закрывает все
// соединения старых воркеров; DDoS Guard режет «тихие» соединения. Сам vite
// на любой обрыв перезагружает страницу. Плагин держит превью живым:
// - сервер шлёт состояние «boot:seq» сразу после каждой рассылки клиентам
//   (update, full-reload, error...) и раз в 5-9 с — это и двусторонний
//   keepalive для DDoS Guard (рандом — чтобы не ловить его фильтр одинаковых
//   интервалов). boot меняется на рестарте vite, seq — на каждой рассылке;
// - клиент (скрипт в index.html) подменяет сокет vite-hmr «вечным»: на
//   обрыве тихо переподключается и перезагружает страницу, только если за
//   время разрыва сервер рестартовал или что-то разослал. Не переподключился
//   с трёх попыток — отдаёт обрыв vite, дальше как раньше (ждёт сервер и
//   перезагружает).
// Клиентский ping понижен до 7 с через server.hmr.timeout ниже.
const hmrClient = `(() => {
    const NativeWebSocket = WebSocket;
    class HmrSocket extends EventTarget {
        OPEN = 1;
        readyState = 0;
        state = "";
        queue = [];
        constructor(url, protocols) {
            super();
            this.url = url;
            this.protocols = protocols;
            this.connect(0);
        }
        connect(attempt) {
            const ws = this.ws = new NativeWebSocket(this.url, this.protocols);
            let fresh = true;
            ws.onopen = () => {
                attempt = 0;
                this.queue.splice(0).forEach((data) => ws.send(data));
                if (this.readyState === 0) {
                    this.readyState = 1;
                    this.dispatchEvent(new Event("open"));
                }
            };
            ws.onmessage = (event) => {
                if (event.data.includes('"ezst:hmr"')) {
                    const state = JSON.parse(event.data).data;
                    if (fresh && this.state && this.state !== state) return location.reload();
                    fresh = false;
                    this.state = state;
                }
                this.dispatchEvent(new MessageEvent("message", {data: event.data}));
            };
            ws.onclose = (event) => {
                if (this.readyState === 3) return;
                if (!this.state || attempt === 3) {
                    this.readyState = 3;
                    return this.dispatchEvent(new CloseEvent("close", event));
                }
                setTimeout(() => this.connect(attempt + 1), attempt * 1000);
            };
        }
        send(data) {
            if (this.ws.readyState === 1) this.ws.send(data);
            else this.queue.push(data);
        }
        close(code, reason) {
            this.readyState = 3;
            this.ws.close(code, reason);
        }
    }
    window.WebSocket = new Proxy(NativeWebSocket, {
        construct: (target, args) => args[1] === "vite-hmr" ? new HmrSocket(...args) : new target(...args),
    });
})();`;

const hmrKeepalive = {
    name: 'hmr-ws-keepalive',
    apply: 'serve' as const,
    configureServer(server: any) {
        const boot = Date.now().toString(36);
        let seq = 0;
        const state = () => ({type: 'custom', event: 'ezst:hmr', data: `${boot}:${seq}`});
        const broadcast = server.ws.send.bind(server.ws);
        server.ws.send = (...args: any[]) => {
            seq++;
            broadcast(...args);
            broadcast(state());
        };
        server.ws.on('connection', (socket: any) => socket.send(JSON.stringify(state())));
        let timer: ReturnType<typeof setTimeout> | null = null;
        const tick = () => {
            broadcast(state());
            timer = setTimeout(tick, 5000 + Math.floor(Math.random() * 4000));
        };
        timer = setTimeout(tick, 5000 + Math.floor(Math.random() * 4000));
        server.httpServer?.on('close', () => {
            if (timer) clearTimeout(timer);
        });
    },
    transformIndexHtml: () => [{tag: 'script', children: hmrClient, injectTo: 'head-prepend' as const}],
};

const sitemapFromAdmin = {
    name: 'sitemap-from-admin',
    apply: 'build' as const,
    async closeBundle() {
        try {
            const fs = await import('fs');
            const urls = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'backend/func2url.json'), 'utf-8'));
            if (!urls.seo) return;
            const res = await fetch(`${urls.seo}?action=sitemap.xml`, {signal: AbortSignal.timeout(10000)});
            const xml = await res.text();
            if (res.ok && xml.includes('<urlset')) fs.writeFileSync(path.resolve(__dirname, 'dist/sitemap.xml'), xml);
        } catch {
            return;
        }
    },
};

const usedIcons = {
    name: 'used-icons',
    enforce: 'pre' as const,
    resolveId(id: string) {
        return id === 'virtual:icons' ? '\0virtual:icons' : null;
    },
    async load(id: string) {
        if (id !== '\0virtual:icons') return null;
        if (process.env.NODE_ENV !== 'production') return "export * from 'lucide-react';";
        const fs = await import('fs');
        const lucide: Record<string, unknown> = await import('lucide-react');
        const names = new Set<string>(['CircleAlert']);
        const walk = (dir: string) => {
            for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
                const full = path.join(dir, f.name);
                if (f.isDirectory()) walk(full);
                else if (/\.(tsx?|jsx?)$/.test(f.name)) {
                    for (const m of fs.readFileSync(full, 'utf-8').matchAll(/["'`]([A-Z][A-Za-z0-9]+)["'`]/g)) {
                        if (m[1] in lucide && typeof lucide[m[1]] === 'object') names.add(m[1]);
                    }
                }
            }
        };
        walk(path.resolve(__dirname, 'src'));
        return `export { ${[...names].join(', ')} } from 'lucide-react';`;
    },
};

let outDir = path.resolve(__dirname, 'dist');

const prerenderPages = {
    name: 'prerender-pages',
    apply: 'build' as const,
    configResolved(config: any) {
        outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
        try {
            const fs = await import('fs');
            const urls = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'backend/func2url.json'), 'utf-8'));
            const {prerender} = await import('./prerender');
            await prerender(outDir, urls.articles);
        } catch (e) {
            console.warn('prerender skipped', e);
        }
    },
};

// https://vitejs.dev/config/
export default defineConfig(({mode}) => ({
    plugins: [
        react(),
        hmrKeepalive,
        sitemapFromAdmin,
        prerenderPages,
        usedIcons,
        mode === 'development' &&
        componentTagger(),
    ].filter(Boolean),
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: true,
        hmr: {
            overlay: false, // Disables the error overlay if you only want console errors
            timeout: 7000, // pingInterval @vite/client — нужен <30s для DDoS Guard
        }
    },
}));
