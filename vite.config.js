import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'

const isGitHubPages = process.env.DEPLOY_TARGET === 'GH_PAGES';
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
const plugins = [vue(), tailwindcss(), svgLoader()];

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
    host: true
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
