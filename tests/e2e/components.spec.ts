import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/components/');
});

test('страница не прокручивается по горизонтали', async ({ page }) => {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
});

test('тема берётся из системы и переключается', async ({ page }, info) => {
  const html = page.locator('html');
  const initial = info.project.use.colorScheme === 'dark' ? 'dark' : 'light';
  await expect(html).toHaveAttribute('data-theme', initial);
  await page.getByRole('button', { name: 'Переключить тему' }).click();
  await expect(html).toHaveAttribute('data-theme', initial === 'dark' ? 'light' : 'dark');
});

test('формулы рендерятся KaTeX, битый TeX показывается исходником', async ({ page }) => {
  await expect(page.locator('.rz-ask .katex').first()).toBeVisible();
  await expect(page.locator('.rz-tex-raw')).toHaveCount(1);
});

test('вопрос: ответ блокирует варианты, показывает объяснение и считается в Score', async ({ page }) => {
  const quiz = page.locator('.rz-quiz').first();
  await quiz.getByRole('button', { name: /Уменьшится вдвое/ }).click();
  await expect(quiz.getByRole('status')).toContainText('Верно.');
  await expect(quiz.locator('.rz-quiz-opt').first()).toBeDisabled();
  await expect(page.locator('.rz-score-big')).toHaveText('1');
});

test('пошаговый вывод открывает шаги по одному', async ({ page }) => {
  const steps = page.locator('.rz-steps');
  await expect(steps.locator('.rz-step')).toHaveCount(2);
  await steps.getByRole('button', { name: 'Следующий шаг' }).click();
  await expect(steps.locator('.rz-step')).toHaveCount(3);
  await steps.getByRole('button', { name: 'Показать все' }).click();
  await expect(steps.locator('.rz-steps-count')).toHaveText('4 / 4');
});

test('ползунок обновляет строку результатов', async ({ page }) => {
  const lab = page.locator('.rz-lab');
  await lab.locator('input[type=range]').first().fill('0.5');
  await expect(lab.locator('.rz-lab-readout')).toContainText('2.00');
});

test('«Урок пройден» переключается', async ({ page }) => {
  const btn = page.getByRole('button', { name: 'Урок пройден' });
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(btn).toHaveText('✓ Урок пройден');
});
