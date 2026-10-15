import { expect, test, type Page } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';

const lab = async (page: Page, n: string) => hydrated(page.locator('.rz-lab').filter({ hasText: `Лаборатория ${n}` }));
const task = async (page: Page, n: string) => hydrated(page.locator('.sg-sr-task').filter({ hasText: `Задача ${n}` }));

test('математическая статистика: все уроки и самостоятельные без прокрутки вбок, битого TeX и ошибок', async ({ page }) => {
  await page.goto('/stats/');
  const hrefs = await page.locator('a.sg-outline-row').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  expect(hrefs).toHaveLength(10);
  for (const href of hrefs) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(href);
    await allHydrated(page);
    // Лаборатории и задачи — client:visible: прокручиваем страницу, чтобы все острова отрисовались.
    for (const island of await page.locator('astro-island[client="visible"]').all()) await hydrated(island.locator(':scope > *').first());
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll, `${href}: горизонтальная прокрутка`).toBeLessThanOrEqual(client);
    await expect(page.locator('.rz-tex-raw, .katex-error'), `${href}: битый TeX`).toHaveCount(0);
    expect(errors, `${href}: ошибки`).toEqual([]);
    page.removeAllListeners('pageerror');
  }
});

test('страница курса: 8 уроков в двух модулях, две самостоятельные', async ({ page }) => {
  await page.goto('/stats/');
  await allHydrated(page);
  await expect(page.locator('.sg-outline-chapter')).toHaveCount(2);
  await expect(page.locator('.sg-outline .sg-outline-row')).toHaveCount(8);
  const works = page.locator('.sg-works a.sg-outline-row');
  await expect(works).toHaveCount(2);
  await expect(works.first()).toHaveAttribute('href', '/stats/sr/1/');
  await expect(page.getByRole('link', { name: 'Самостоятельная 2' })).toHaveAttribute('href', '/stats/sr/2/');
  await expect(page.locator('.sg-course-stats')).toContainText('задач в СР');
});

test.describe('самостоятельная 1', () => {
  test('верный ответ засчитывается, неверный — нет, ответ открывается', async ({ page }) => {
    await page.goto('/stats/sr/1/');
    await allHydrated(page);
    const score = page.locator('.sg-exam-score');
    await expect(score).toContainText('из 0 верно');

    const t = await task(page, '1.1');
    await t.getByRole('textbox').nth(0).fill('3,5');
    await t.getByRole('textbox').nth(1).fill('1.71');
    await t.getByRole('button', { name: 'Проверить' }).click();
    await expect(t.locator('.sg-sr-verdict.is-ok')).toHaveCount(2);
    await expect(t).toContainText('✓ решена');
    await expect(score.locator('.rz-score-big')).toHaveText('1');

    const t2 = await task(page, '1.2');
    await t2.getByRole('textbox').nth(0).fill('0.7');
    await t2.getByRole('textbox').nth(1).fill('1.81');
    await t2.getByRole('button', { name: 'Проверить' }).click();
    // σ² вместо σ — типичная ошибка; первая ячейка верна.
    await expect(t2.locator('.sg-sr-verdict.is-ok')).toHaveCount(1);
    await expect(t2.locator('.sg-sr-verdict.is-bad')).toContainText('неверно');
    await t2.getByRole('button', { name: 'Подсказка' }).click();
    await expect(t2.locator('.sg-trainer-hint')).toBeVisible();
    await t2.getByRole('button', { name: 'Показать ответ' }).click();
    await expect(t2.locator('.sg-trainer-ans .katex').first()).toBeVisible();
    await expect(t2).toContainText('ответ открыт');
    await expect(score).toContainText('из 2 верно');
  });

  test('проценты и степени десяти читаются как на бумаге', async ({ page }) => {
    await page.goto('/stats/sr/2/');
    const t = await task(page, '4.1');
    await t.getByRole('textbox').fill('6.4·10^-4');
    await t.getByRole('button', { name: 'Проверить' }).click();
    await expect(t.locator('.sg-sr-verdict')).toContainText('верно');
    const d = await task(page, '4.2');
    await d.getByRole('textbox').fill('9.5 %');
    await d.getByRole('button', { name: 'Проверить' }).click();
    await expect(d.locator('.sg-sr-verdict.is-ok')).toHaveCount(1);
  });
});

test.describe('лаборатории', () => {
  test('1.1: моменты набора с лекции и своя выборка', async ({ page }) => {
    await page.goto('/stats/01-moments/');
    const l = await lab(page, '1.1');
    await expect(l.locator('.rz-lab-readout')).toContainText('= 5.4');
    await expect(l.locator('.rz-lab-readout')).toContainText('= 40.6');
    await l.getByRole('textbox').fill('0 2');
    await expect(l.locator('.rz-lab-readout')).toContainText('= 1');
    await expect(l.locator('.rz-lab-table')).toContainText('0.5');
  });

  test('легенды: цвета знаков — токены текущей темы', async ({ page }) => {
    await page.goto('/stats/05-poisson/');
    const l = await lab(page, '5.1');
    const marks = l.locator('.rz-legend-mark');
    await expect(marks).toHaveCount(3);
    for (const m of await marks.all()) {
      const [token, stroke, expected] = await m.evaluate((el) => {
        const t = el.getAttribute('data-token')!;
        const probe = el.querySelector('line, rect, circle, polyline')!;
        return [t, getComputedStyle(probe).stroke, getComputedStyle(document.documentElement).getPropertyValue(`--${t}`).trim()];
      });
      const tmp = await page.evaluate((c) => { const d = document.createElement('div'); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; }, expected);
      expect(stroke, token).toBe(tmp);
    }
  });

  test('4.2: сотня богачей поднимает среднюю, медиана стоит', async ({ page }) => {
    await page.goto('/stats/04-quantiles/');
    const l = await lab(page, '4.2');
    await expect(l.locator('.rz-lab-readout')).toContainText(/20\s738/);
    await expect(l.locator('.rz-lab-readout')).toContainText(/3\s000/);
    await l.getByRole('slider', { name: /Сколько человек/ }).fill('0');
    await expect(l.locator('.rz-lab-readout')).toContainText(/5\s740/);
  });

  test('6.2: задача с лекции — 269 в первом приближении, точный корень 271.5', async ({ page }) => {
    await page.goto('/stats/06-deadtime/');
    const l = await lab(page, '6.2');
    await expect(l.locator('.rz-lab-readout')).toContainText('268.9');
    await expect(l.locator('.rz-lab-table')).toContainText('271.5');
  });

  test('7.2: кнопка МНК ставит минимум суммы квадратов', async ({ page }) => {
    await page.goto('/stats/07-least-squares/');
    const l = await lab(page, '7.2');
    await expect(l.locator('.rz-lab-status')).not.toHaveClass(/is-ok/);
    await l.getByRole('button', { name: 'Поставить МНК' }).click();
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-ok/);
    await expect(l.locator('.rz-lab-readout')).toContainText('y = 0.910x + 20.10');
  });

  test('8.1: задача с лекции — x ≈ 4.03 м', async ({ page }) => {
    await page.goto('/stats/08-likelihood/');
    const l = await lab(page, '8.1');
    await expect(l.locator('.rz-lab-readout')).toContainText('= 4.03');
    await l.getByRole('button', { name: 'Пропустить частицу' }).click();
    await expect(l.locator('.rz-lab-readout')).not.toContainText('= 4.03');
    await l.getByRole('button', { name: 'Задача с лекции' }).click();
    await expect(l.locator('.rz-lab-readout')).toContainText('= 4.03');
  });
});
