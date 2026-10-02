import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./auth',outputDir:'./auth-results',workers:1,timeout:30000,reporter:'list',
  use:{baseURL:'http://127.0.0.1:5175',headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'},
  webServer:{command:'npm run preview -- --outDir auth-test-dist --port 5175 --strictPort',url:'http://127.0.0.1:5175',reuseExistingServer:!process.env.CI,timeout:30000}
});

