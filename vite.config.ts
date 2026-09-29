import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Relative base so the app works from https://<user>.github.io/<repo>/ and any other sub-path.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered manually in src/pwa.ts
      includeAssets: ['icons/*.png', 'icons/*.svg', 'engine/*', 'puzzles/*.json'],
      manifest: {
        name: 'Chess Seeker — Private Chess Trainer',
        short_name: 'Chess Seeker',
        description: 'Learn, practise and play chess offline. No ads, no accounts, no data leaves your phone.',
        theme_color: '#1b1d22',
        background_color: '#1b1d22',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        categories: ['games', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything, including the Stockfish WASM and the puzzle pack: fully offline after first load.
        globPatterns: ['**/*.{js,css,html,png,svg,wasm,json,txt,webmanifest}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
