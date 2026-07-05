import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

const THABELLA = 'https://thabella.th-deg.de/thabella/opn';

/**
 * Dev-only middleware that mirrors the production Vercel functions
 * (`api/rooms.js`, `api/periods.js`). It lets `npm run dev` hit THabella
 * server-side — no CORS, no `vercel dev` needed. Production still uses the
 * real serverless functions under `/api`.
 */
function devThabellaApi(): Plugin {
  return {
    name: 'dev-thabella-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        try {
          if (url.pathname === '/api/rooms') {
            const upstream = await fetch(`${THABELLA}/room/findRooms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{}',
            });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = upstream.status;
            res.end(await upstream.text());
            return;
          }
          if (url.pathname === '/api/periods') {
            const date = url.searchParams.get('date');
            if (!date) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'date query parameter required' }));
              return;
            }
            const upstream = await fetch(
              `${THABELLA}/period/findByDate/${encodeURIComponent(date)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sqlDate: date }),
              },
            );
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = upstream.status;
            res.end(await upstream.text());
            return;
          }
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: (err as Error).message }));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    devThabellaApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-180.png'],
      manifest: {
        name: 'THD Room Finder',
        short_name: 'Room Finder',
        description:
          'Find free study rooms at Technische Hochschule Deggendorf in real time.',
        lang: 'en',
        theme_color: '#1565C0',
        background_color: '#F4F6FA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell is precached; THabella data is network-first with a
        // short cache so the app still opens (with last data) offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'thabella-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
