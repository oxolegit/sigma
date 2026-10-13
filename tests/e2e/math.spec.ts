import { expect, test, type Page } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';

const lab = async (page: Page, n: string) => hydrated(page.locator('.rz-lab').filter({ hasText: `Лаборатория ${n}` }));
const trainer = async (page: Page, n: string) => hydrated(page.locator('.sg-trainer').filter({ hasText: `Тренажёр ${n}` }));

test.describe('математика: урок 1', () => {
  test('1.1: секущая стремится к касательной, у |x| в нуле производной нет', async ({ page }) => {
    await page.goto('/math/01-derivative/');
    const l = await lab(page, '1.1');
    const status = l.locator('.rz-lab-status');
    await expect(status).toHaveClass(/is-warn/);
    await l.getByRole('slider', { name: /Приращение/ }).fill('0.002');
    await expect(status).toHaveClass(/is-ok/);
    await expect(l.locator('.rz-lab-readout')).toContainText('= 2.002');
    await l.getByLabel('Функция', { exact: true }).selectOption('abs');
    await l.getByRole('slider', { name: /Точка/ }).fill('0');
    await expect(status).toHaveClass(/is-bad/);
    await expect(status).toContainText('справа Δy/Δx → 1.00, слева → -1.00');
  });

  test('тренажёр: неверный ответ отклоняется, подсказка, затем ответ', async ({ page }) => {
    await page.goto('/math/01-derivative/');
    const t = await trainer(page, '1.1');
    await expect(t.locator('.sg-trainer-q')).toContainText('Найдите производную');
    const input = t.getByRole('textbox');
    await input.fill('x^2 + 1');
    await expect(t.locator('.sg-trainer-preview .katex')).toBeVisible();
    await t.getByRole('button', { name: 'Проверить' }).click();
    await expect(t.getByRole('status')).toContainText('Неверно');
    await t.getByRole('button', { name: 'Подсказка' }).click();
    await expect(t.locator('.sg-trainer-hint')).toContainText('Степень');
    await t.getByRole('button', { name: 'Показать ответ' }).click();
    await expect(t.locator('.sg-trainer-ans .katex')).toBeVisible();
    // Другой тип задач и новая задача.
    await t.getByRole('radio', { name: 'Корни и отрицательные степени' }).click();
    await expect(t.getByRole('radio', { name: 'Корни и отрицательные степени' })).toHaveAttribute('aria-checked', 'true');
    await expect(t.locator('.sg-trainer-ans')).toHaveCount(0);
  });

  test('тренажёр принимает верный ответ в любой записи', async ({ page }) => {
    await page.goto('/math/01-derivative/');
    const t = await trainer(page, '1.1');
    // Ответ берём из «Показать ответ» — проверка должна принять производную, записанную иначе: через mathjs из условия.
    const f = await t.locator('.sg-trainer-q annotation').first().textContent();
    expect(f).toMatch(/f\(x\)=/);
    await t.getByRole('button', { name: 'Подсказка' }).click();
    await t.getByRole('button', { name: 'Показать ответ' }).click();
    const ans = (await t.locator('.sg-trainer-ans annotation').first().textContent())!.replace(/^f'\(x\)=/, '');
    // TeX ответа → ввод студента: x^{5} → x^(5), \frac → дробь, \sqrt → sqrt; умножение mathjs понимает и без знака.
    const typed = ans
      .replace(/\\left|\\right/g, '').replace(/\\cdot/g, '*').replace(/\\[,;!]/g, ' ')
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)').replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
      .replace(/\^\{([^{}]+)\}/g, '^($1)').replace(/[{}]/g, (b) => (b === '{' ? '(' : ')')).replace(/\s+/g, ' ').trim();
    await t.getByRole('textbox').fill(typed);
    await t.getByRole('button', { name: 'Проверить' }).click();
    await expect(t.getByRole('status')).toContainText('Верно');
  });

  test('литература: в уроке — Пискунов с главами, на странице курса — с примечанием', async ({ page }) => {
    await page.goto('/math/01-derivative/');
    const lit = page.locator('.sg-lit');
    await expect(lit.locator('cite')).toHaveCount(1);
    await expect(lit.locator('cite a')).toHaveAttribute('href', /urss\.ru/);
    await expect(lit).toContainText('гл. III «Производная и дифференциал»');
    await expect(page.locator('.sg-eyebrow-accent')).toHaveText('Урок 1 · гл. III · Модуль 1');

    await page.goto('/math/');
    await allHydrated(page);
    await expect(page.locator('.sg-lit')).toContainText('Пискунов Н. С.');
    await expect(page.locator('.sg-lit')).toContainText('главы нумеруются сквозь оба тома');
    await expect(page.locator('.sg-outline-row')).toHaveCount(25);
  });
});
