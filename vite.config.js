import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const isGitHubPages = process.env.DEPLOY_TARGET === 'GH_PAGES';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
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
