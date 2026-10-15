import { expect, test } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';

test.describe('лаборатории: ползунок не двигает раскладку', () => {
  for (const path of ['/nuclear/05-liquid-drop/', '/nuclear/07-quadrupole-fermi/', '/nuclear/09-ionization/', '/stats/05-poisson/', '/tpn/04-mfp/']) {
    test(path, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(path);
      const labs = page.locator('figure.rz-lab').filter({ has: page.locator('input[type="range"]') });
      const n = await labs.count();
      expect(n, 'на странице есть лаборатории с ползунками').toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const lab = await hydrated(labs.nth(i));
        const slider = lab.locator('input[type="range"]').first();
        await slider.scrollIntoViewIfNeeded();
        // Положение ползунка и размер сцены — относительно рамки, чтобы не зависеть от прокрутки.
        const geom = () => lab.evaluate((fig) => {
          const top = fig.getBoundingClientRect().top;
          const r = fig.querySelector('input[type="range"]')!.getBoundingClientRect();
          const st = fig.querySelector('.rz-lab-stage')!.getBoundingClientRect();
          return { sliderY: Math.round(r.top - top), sliderX: Math.round(r.left), stageH: Math.round(st.height), stageW: Math.round(st.width) };
        });
        const before = await geom();
        const [min, max] = await slider.evaluate((el: HTMLInputElement) => [el.min, el.max]);
        for (const v of [min, max, min]) {
          await slider.fill(v);
          await page.waitForTimeout(80);
          expect(await geom(), `${path}: лаборатория ${i + 1}, значение ${v}`).toEqual(before);
        }
      }
    });
  }
});

test('поиск: Ctrl+K находит лабораторию, Enter переходит к ней', async ({ page }) => {
  await page.goto('/');
  await allHydrated(page);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Поиск по сайту' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox').fill('оболочки спин');
  await expect(dialog.getByRole('option').first()).toContainText('Оболочки');
  await dialog.getByRole('combobox').fill('кривая Бете');
  await expect(dialog.getByRole('group', { name: 'Лаборатории' })).toContainText('Ионизационные потери');
  await dialog.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(/\/nuclear\/09-ionization\/#lab-9\.1/);
});

test('попап формулы: разбор с таблицей символов, Esc закрывает и возвращает фокус', async ({ page }) => {
  await page.goto('/nuclear/01-kinematics/');
  await allHydrated(page);
  const formula = page.locator('.sg-lesson-body > .katex-display[data-formula]').filter({ hasText: '(pc)' }).first();
  await formula.click();
  const pop = page.getByRole('dialog', { name: 'О формуле' });
  await expect(pop).toBeVisible();
  await expect(pop.locator('.sg-fp-title')).toHaveText('Связь энергии и импульса');
  await expect(pop.locator('.sg-fp-symbols tr')).toHaveCount(4);
  await pop.locator('.sg-fp-symbols tr').first().hover();
  await expect(pop.locator('.sg-fp-formula [data-s="E"].is-on')).toHaveCount(1);
  await expect(pop.locator('.sg-fp-hint')).toContainText('полная энергия');
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  await expect(formula).toBeFocused();
});

test('попап формулы без разбора: заголовок — раздел урока, есть копирование TeX', async ({ page }) => {
  await page.goto('/nuclear/01-kinematics/');
  await allHydrated(page);
  await page.locator('.sg-lesson-body > .katex-display[data-formula]').first().click();
  const pop = page.getByRole('dialog', { name: 'О формуле' });
  await expect(pop.locator('.sg-fp-title')).toHaveText('Энергии — в электронвольтах');
  await expect(pop).toContainText('разбор готовится');
  await expect(pop.getByRole('button', { name: 'Скопировать TeX' })).toBeVisible();
});

test('попап Вайцзеккера: узнаётся в разных записях, ссылки на другие места', async ({ page }) => {
  await page.goto('/nuclear/05-liquid-drop/');
  await allHydrated(page);
  await page.locator('.sg-lesson-body > .katex-display[data-formula]').first().click();
  const pop = page.getByRole('dialog', { name: 'О формуле' });
  await expect(pop.locator('.sg-fp-title')).toHaveText('Формула Вайцзеккера');
  await expect(pop.locator('.sg-fp-places')).toContainText('шпаргалка');
});

test('оглавление курса: фильтр «С лабораториями» и «Не пройдены»', async ({ page }) => {
  await page.goto('/math/');
  await allHydrated(page);
  const rows = page.locator('.sg-outline .sg-outline-row');
  const total = await rows.count();
  await page.getByRole('button', { name: /^С лабораториями/ }).click();
  const withLabs = await rows.count();
  expect(withLabs).toBeLessThan(total);
  await page.getByRole('button', { name: /^Не пройдены/ }).click();
  await expect(rows.first()).toBeVisible();
  await page.getByRole('button', { name: /^Все уроки/ }).click();
  await expect(rows).toHaveCount(total);
});
