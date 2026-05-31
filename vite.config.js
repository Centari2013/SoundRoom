import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'
import { VitePWA } from 'vite-plugin-pwa'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const isGitHubPages = process.env.DEPLOY_TARGET === 'GH_PAGES';
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
const SITE_URL = (process.env.VITE_SITE_URL || 'https://soundroom.live').replace(/\/$/, '');

// Public routes that should ship their own static HTML at build time so
// crawlers and link previewers see route-specific meta tags. Each clones
// dist/index.html and swaps in title/description/canonical/OG fields.
// The Vue app still mounts and takes over once JS loads.
const PRERENDER_ROUTES = [
  {
    path: '/app',
    title: 'SoundRoom Studio',
    description: 'Design and layer immersive spatial audio scenes in your browser. Drag directional sources, sculpt ambient mixes, and save custom rooms with SoundRoom.',
  },
  {
    path: '/terms',
    title: 'Terms of Service | SoundRoom',
    description: 'Review the SoundRoom Terms of Service covering usage guidelines, licensing, and account responsibilities.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | SoundRoom',
    description: 'Understand how SoundRoom handles your account data, audio uploads, and privacy preferences.',
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | SoundRoom',
    description: 'Understand how SoundRoom handles your cookie data and tracking preferences.',
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function applyRouteMetaToHtml(html, route) {
  const url = `${SITE_URL}${route.path}`
  const title = escapeHtml(route.title)
  const description = escapeHtml(route.description)

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta[^>]+name="description"[^>]+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta[^>]+property="og:title"[^>]+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta[^>]+property="og:description"[^>]+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta[^>]+property="og:url"[^>]+content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta[^>]+name="twitter:title"[^>]+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta[^>]+name="twitter:description"[^>]+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<link[^>]+rel="canonical"[^>]+href=")[^"]*(")/, `$1${url}$2`)
}

function prerenderPublicRoutes() {
  return {
    name: 'soundroom-prerender-public-routes',
    apply: 'build',
    async closeBundle() {
      const distDir = path.resolve('dist')
      const indexPath = path.join(distDir, 'index.html')

      let indexHtml
      try {
        indexHtml = await fs.readFile(indexPath, 'utf-8')
      } catch (err) {
        console.warn('[prerender] dist/index.html missing — skipping route prerender.', err)
        return
      }

      for (const route of PRERENDER_ROUTES) {
        const html = applyRouteMetaToHtml(indexHtml, route)
        const segment = route.path.replace(/^\//, '')
        const outDir = path.join(distDir, segment)
        const outPath = path.join(outDir, 'index.html')
        await fs.mkdir(outDir, { recursive: true })
        await fs.writeFile(outPath, html, 'utf-8')
      }
    }
  }
}

const plugins = [
  vue(),
  tailwindcss(),
  svgLoader(),
  prerenderPublicRoutes(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'SoundRoom.png'],
    manifest: {
      name: 'SoundRoom',
      short_name: 'SoundRoom',
      description: 'Design immersive spatial audio scenes in your browser.',
      theme_color: '#09090b',
      background_color: '#09090b',
      display: 'standalone',
      orientation: 'landscape',
      scope: '/',
      start_url: '/app',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      // Cache the app shell (JS, CSS, HTML, fonts, SVGs)
      // Audio files in S3 are intentionally excluded — too large to precache
      globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico}'],
      globIgnores: ['**/impulses/**'],
      runtimeCaching: [
        {
          // Cache Supabase API responses briefly for offline resilience
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
          },
        },
      ],
    },
  }),
];

if (hasSentryAuthToken) {
  plugins.push(sentryVitePlugin({
    org: "soundroom",
    project: "javascript-vue",
    authToken: process.env.SENTRY_AUTH_TOKEN,
    telemetry: false,
    sourcemaps: {
      filesToDeleteAfterUpload: ['dist/**/*.map'],
    },
  }));
}

export default defineConfig({
  server: {
    host: true,
    // Respect the PORT env var injected by Claude's preview tool (or any other runner)
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
  },
  plugins,

  resolve: {
    alias: [
      {
        find: '@',
        replacement: '/src'
      }
    ]
  },

  base: isGitHubPages ? '/SoundRoom/' : '/',

  test: {
    include: ['test/unit/**/*.test.{js,ts}'],
    exclude: ['e2e/**'],
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/unit/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,vue}', 'api/**/*.js'],
      exclude: [
        'src/main.js',
        'src/assets/**',
        'src/content/**',
        '**/*.config.js',
      ],
    },
  },

  build: {
    sourcemap: hasSentryAuthToken ? 'hidden' : false
  }
})
