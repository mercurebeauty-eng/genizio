// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // 'prompt' + injectRegister:false hands control of the update flow to our own
        // PwaUpdateBanner component (virtual:pwa-register/react) instead of the plugin's
        // auto-injected script. With the previous 'autoUpdate', a new service worker took
        // over silently in the background — already-open tabs kept running the stale JS
        // bundle until the next full navigation/reload, which is the "changes don't show up
        // instantly" symptom reported. 'prompt' installs the new SW and waits for an explicit
        // updateServiceWorker() call, which the banner triggers.
        registerType: 'prompt',
        injectRegister: false,
        outDir: '.output/public',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        // This app is server-rendered per route (TanStack Start/Nitro) — there is
        // no single static index.html shell to fall back to. vite-plugin-pwa's
        // generateSW strategy defaults navigateFallback to 'index.html', which
        // doesn't exist in .output/public and isn't in the precache manifest,
        // so every fresh navigation (cold PWA launch, hard refresh, deep link)
        // was intercepted by the service worker and served a broken response —
        // the exact "mangled layout" bug reported on iOS. Disabling it lets
        // navigation requests hit the network/server as normal; static assets
        // (JS/CSS/images) are still precached below.
        workbox: {
          navigateFallback: null,
        },
        manifest: {
          name: 'Génizio',
          short_name: 'Génizio',
          description: 'Révélez le potentiel de vos enfants',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ]
  }
});
