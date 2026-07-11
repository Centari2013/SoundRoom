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

// Shared per-route metadata used to (a) prerender static HTML for crawlers
// and (b) generate the sitemap, so both stay in sync from one source of
// truth instead of two hand-maintained lists.
//   - prerender: clone dist/index.html and swap in title/description/
//     canonical/OG/JSON-LD fields. The Vue app still mounts and takes over
//     once JS loads.
//   - sitemap: { priority, changefreq } to emit a <url> entry; omit for
//     routes that shouldn't be publicly indexed (e.g. /app itself).
function legalPageJsonLd(route) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: `${SITE_URL}${route.path}`,
    isPartOf: { '@type': 'WebSite', name: 'SoundRoom', url: SITE_URL },
  }
}

const SITE_ROUTES = [
  {
    path: '/',
    title: 'SoundRoom',
    description: 'Build immersive 3D soundscapes in your browser with SoundRoom. Drag, design, and save spatial audio scenes anytime.',
    sitemap: { priority: '1.0', changefreq: 'weekly' },
  },
  {
    path: '/app',
    title: 'SoundRoom Studio',
    description: 'Design and layer immersive spatial audio scenes in your browser. Drag directional sources, sculpt ambient mixes, and save custom rooms with SoundRoom.',
    prerender: true,
  },
  {
    path: '/app/upgrade',
    title: 'Pricing & Plans | SoundRoom',
    description: 'Compare SoundRoom plans to unlock expanded sound libraries, room saves, and upcoming collaboration features.',
    prerender: true,
    sitemap: { priority: '0.8', changefreq: 'monthly' },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'SoundRoom Plans',
      description: 'Compare SoundRoom plans to unlock expanded sound libraries, room saves, and upcoming collaboration features.',
      brand: { '@type': 'Brand', name: 'SoundRoom' },
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: '2 saved rooms, basic scheduling, and access to starter sounds.' },
        { '@type': 'Offer', name: 'Basic', price: '5', priceCurrency: 'USD', description: 'Up to 10 saved rooms, curated sound packs, and full scheduling including play counts.' },
        { '@type': 'Offer', name: 'Pro', price: '10', priceCurrency: 'USD', description: 'Unlimited rooms, custom audio uploads, all sound packs, UI themes, and the timeline sequencer.' },
      ],
    },
  },
  {
    path: '/policies',
    title: 'Policies & Terms | SoundRoom',
    description: 'Find SoundRoom legal documents, including the Privacy Policy, Terms of Service, and Cookie Policy.',
    prerender: true,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
  {
    path: '/terms',
    title: 'Terms of Service | SoundRoom',
    description: 'Review the SoundRoom Terms of Service covering usage guidelines, licensing, and account responsibilities.',
    prerender: true,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | SoundRoom',
    description: 'Understand how SoundRoom handles your account data, audio uploads, and privacy preferences.',
    prerender: true,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | SoundRoom',
    description: 'Understand how SoundRoom handles your cookie data and tracking preferences.',
    prerender: true,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
];

for (const route of SITE_ROUTES) {
  if (route.prerender && !route.jsonLd && route.path !== '/app') {
    route.jsonLd = legalPageJsonLd(route)
  }
}

const PRERENDER_ROUTES = SITE_ROUTES.filter((route) => route.prerender)

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

  let output = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta[^>]+name="description"[^>]+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta[^>]+property="og:title"[^>]+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta[^>]+property="og:description"[^>]+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta[^>]+property="og:url"[^>]+content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta[^>]+name="twitter:title"[^>]+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta[^>]+name="twitter:description"[^>]+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<link[^>]+rel="canonical"[^>]+href=")[^"]*(")/, `$1${url}$2`)

  if (route.jsonLd) {
    const jsonLdScript = `<script type="application/ld+json">\n  ${JSON.stringify(route.jsonLd, null, 2)}\n  </script>`
    output = output.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLdScript)
  }

  return output
}

function generateSitemapXml() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = SITE_ROUTES
    .filter((route) => route.sitemap)
    .map((route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.sitemap.changefreq}</changefreq>
    <priority>${route.sitemap.priority}</priority>
  </url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
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

      // Overwrite the static public/sitemap.xml copy with a freshly dated one
      // generated from the same SITE_ROUTES list used for prerendering, so
      // lastmod reflects the actual build date instead of a frozen value.
      await fs.writeFile(path.join(distDir, 'sitemap.xml'), generateSitemapXml(), 'utf-8')
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
      // Take control of all open tabs immediately when a new SW installs —
      // without this the user has to close every tab before the update lands.
      skipWaiting: true,
      clientsClaim: true,

      // Cache the app shell, but keep large preview/splash images out of the
      // install path so service-worker startup does not stall on slower links.
      globPatterns: ['**/*.{js,css,html,svg,woff2}'],
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
