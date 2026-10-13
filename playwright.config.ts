import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    // Локально — установленный Edge, в CI — скачанный Chromium.
    ...(process.env.CI ? {} : { channel: 'msedge' }),
    // Без непрерывных 3D-анимаций: в headless WebGL считается на процессоре, и параллельные воркеры
    // не успевают гидрировать острова. Тесты проверяют числа, а не движение.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
    { name: 'mobile-dark', use: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npx astro build && npx astro preview --host 127.0.0.1 --port 4321 --force',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
