import { expect, test, type Page } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';
import { makeVariant } from '../../src/labs/stats/variants';

const lab = async (page: Page, n: string) => hydrated(page.locator('.rz-lab').filter({ hasText: `Лаборатория ${n}` }));

test('математическая статистика: все уроки и самостоятельные без прокрутки вбок, битого TeX и ошибок', async ({ page }) => {
  await page.goto('/stats/');
  const hrefs = await page.locator('a.sg-outline-row').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  expect(hrefs).toHaveLength(10);
  for (const href of hrefs) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(href);
    await allHydrated(page);
    // Разборы в СР свёрнуты и гидрируются при раскрытии — раскрываем.
    for (const d of await page.locator('details.sg-ref').all()) await d.locator('summary').click();
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
  await expect(page.locator('.sg-course-stats')).toContainText('самостоятельные');
});

test.describe('самостоятельные: варианты', () => {
  test('вариант 1: шесть задач, верный ответ засчитывается, неверный — нет', async ({ page }) => {
    await page.goto('/stats/sr/1/');
    await allHydrated(page);
    const tasks = makeVariant(1, 1);
    await expect(page.locator('.sg-variant-title')).toHaveText('Вариант 1');
    await expect(page.locator('.sg-sr-task')).toHaveCount(tasks.length);
    const score = page.locator('.sg-exam-score');
    await expect(score).toContainText('из 0 верно');

    // Первая задача — эталонными числами, записанными с запятой.
    const t1 = page.locator('.sg-sr-task').nth(0);
    for (const [i, a] of tasks[0]!.answers.entries()) await t1.getByRole('textbox').nth(i).fill(String(Number(a.value.toPrecision(5))).replace('.', ','));
    await t1.getByRole('button', { name: 'Проверить' }).click();
    await expect(t1.locator('.sg-sr-verdict.is-ok')).toHaveCount(tasks[0]!.answers.length);
    await expect(t1).toContainText('✓ решена');
    await expect(score.locator('.rz-score-big')).toHaveText('1');

    // Вторая — заведомо неверно, потом открыть ответ.
    const t2 = page.locator('.sg-sr-task').nth(1);
    await t2.getByRole('textbox').first().fill(String(tasks[1]!.answers[0]!.value * 3 + 7));
    await t2.getByRole('button', { name: 'Проверить' }).click();
    await expect(t2.locator('.sg-sr-verdict.is-bad')).toHaveCount(1);
    if (tasks[1]!.hint) await t2.getByRole('button', { name: 'Подсказка' }).click();
    await t2.getByRole('button', { name: 'Показать ответ' }).click();
    await expect(t2.locator('.sg-trainer-ans .katex').first()).toBeVisible();
    await expect(score).toContainText('из 2 верно');
  });

  test('другой вариант — другие числа и счёт с нуля; случайный вариант', async ({ page }) => {
    await page.goto('/stats/sr/2/');
    await allHydrated(page);
    const first = await page.locator('.sg-sr-task .sg-trainer-q').first().textContent();
    const t1 = page.locator('.sg-sr-task').nth(0);
    await t1.getByRole('textbox').first().fill('1');
    await t1.getByRole('button', { name: 'Проверить' }).click();
    await expect(page.locator('.sg-exam-score')).toContainText('из 1 верно');
    await page.getByRole('radio', { name: 'Вариант 3' }).click();
    await expect(page.locator('.sg-variant-title')).toHaveText('Вариант 3');
    await expect(page.locator('.sg-exam-score')).toContainText('из 0 верно');
    await expect(page.locator('.sg-sr-task .sg-trainer-q').first()).not.toHaveText(first!);
    await expect(page.locator('.sg-sr-task').first().getByRole('textbox').first()).toHaveValue('');
    await page.getByRole('button', { name: 'Случайный' }).click();
    await expect(page.locator('.sg-variant-title')).toContainText('Случайный вариант');
    await expect(page.locator('.sg-sr-task')).toHaveCount(6);
  });

  test('шпаргалка и разборы — свёрнуты под вариантом', async ({ page }) => {
    await page.goto('/stats/sr/1/');
    const ref = page.locator('details.sg-ref');
    await expect(ref).not.toHaveAttribute('open', /.*/);
    await ref.locator('summary').click();
    await expect(ref.locator('.rz-steps').first()).toBeVisible();
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
