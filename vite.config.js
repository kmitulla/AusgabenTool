import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Bestehendes public/manifest.json weiterverwenden
      manifest: false,
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'icon-16x16.png',
        'icon-32x32.png',
        'icon-180x180.png',
        'icon-192x192.png',
        'icon-512x512.png',
        'apple-touch-icon.png',
        'icons.svg',
        'manifest.json'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // App-Bundle (Firebase, Charts, PDF, Excel) ist größer als das
        // Workbox-Standardlimit von 2 MB
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: '/AusgabenTool/index.html',
        navigateFallbackDenylist: [/\/404\.html$/],
        runtimeCaching: [
          {
            // Kartenkacheln (OpenStreetMap) begrenzt cachen
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Leaflet-Marker-Icons (unpkg / GitHub)
            urlPattern: /^https:\/\/(unpkg\.com|raw\.githubusercontent\.com)\/.*(marker|leaflet).*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-markers',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  base: '/AusgabenTool/',
})
