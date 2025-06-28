import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'

const isGitHubPages = process.env.DEPLOY_TARGET === 'GH_PAGES';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    svgLoader()
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: '/src'
      }
    ]
  },
  base: isGitHubPages ? '/SoundRoom/' : '/'
})
