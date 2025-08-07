import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'vercel dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
