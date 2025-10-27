import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'

const isGitHubPages = process.env.DEPLOY_TARGET === 'GH_PAGES';

export default defineConfig({
  plugins: [vue(), tailwindcss(), svgLoader(), sentryVitePlugin({
    org: "soundroom",
    project: "javascript-vue"
  })],

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
    exclude: ['e2e/**'], // ⛔ prevent Vitest from running Playwright tests
  },

  build: {
    sourcemap: true
  }
})