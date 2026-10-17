import { expect, test, type Page } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';
import { makeVariant } from '../../src/labs/variants';

const lab = async (page: Page, n: string) => hydrated(page.locator('.rz-lab').filter({ hasText: `Лаборатория ${n} ` }));

test('ядерная физика: все уроки и контрольная без прокрутки вбок, битого TeX и ошибок', async ({ page }) => {
  // Двенадцать страниц с десятками островов — дольше стандартных 30 с.
  test.setTimeout(120_000);
  await page.goto('/nuclear/');
  const hrefs = await page.locator('a.sg-outline-row').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  // 10 уроков, самостоятельная и подготовка к ней.
  expect(hrefs).toHaveLength(12);
  for (const href of hrefs) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(href);
    await allHydrated(page);
    for (const d of await page.locator('details.sg-ref').all()) await d.locator('summary').click();
    for (const island of await page.locator('astro-island[client="visible"]').all()) await hydrated(island.locator(':scope > *').first());
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll, `${href}: горизонтальная прокрутка`).toBeLessThanOrEqual(client);
    await expect(page.locator('.rz-tex-raw, .katex-error'), `${href}: битый TeX`).toHaveCount(0);
    expect(errors, `${href}: ошибки`).toEqual([]);
    page.removeAllListeners('pageerror');
  }
});

test('страница курса: 10 уроков в четырёх модулях и контрольная', async ({ page }) => {
  await page.goto('/nuclear/');
  await allHydrated(page);
  await expect(page.locator('.sg-outline-chapter')).toHaveCount(4);
  await expect(page.locator('.sg-outline .sg-outline-row')).toHaveCount(10);
  await expect(page.locator('.sg-works:not(.sg-preps) a.sg-outline-row')).toHaveCount(1);
  await expect(page.locator('.sg-preps a.sg-outline-row')).toHaveAttribute('href', '/nuclear/prep/1/');
  await expect(page.getByRole('link', { name: 'Самостоятельная 1' })).toHaveAttribute('href', '/nuclear/sr/1/');
});

test.describe('контрольная: вариант', () => {
  test('пять задач по структуре; числа, дробь спина и знак чётности засчитываются', async ({ page }) => {
    await page.goto('/nuclear/sr/1/');
    await allHydrated(page);
    const tasks = makeVariant('nuclear', 1, 1);
    await expect(page.locator('.sg-sr-task')).toHaveCount(5);
    await expect(page.locator('.sg-sr-task').nth(3)).toContainText('Спин, чётность');

    const t1 = page.locator('.sg-sr-task').nth(0);
    for (const [i, a] of tasks[0]!.answers.entries()) await t1.getByRole('textbox').nth(i).fill(String(Number(a.value.toPrecision(5))).replace('.', ','));
    await t1.getByRole('button', { name: 'Проверить' }).click();
    await expect(t1.locator('.sg-sr-verdict.is-ok')).toHaveCount(tasks[0]!.answers.length);

    // Оболочки: спин дробью, чётность знаком.
    const shell = tasks[3]!;
    const t4 = page.locator('.sg-sr-task').nth(3);
    const J = shell.answers[0]!.value;
    await t4.getByRole('textbox').nth(0).fill(`${Math.round(2 * J)}/2`);
    await t4.getByRole('textbox').nth(1).fill(shell.answers[1]!.value > 0 ? '+' : '−');
    await t4.getByRole('textbox').nth(2).fill(String(Number(shell.answers[2]!.value.toFixed(3))));
    await t4.getByRole('button', { name: 'Проверить' }).click();
    await expect(t4.locator('.sg-sr-verdict.is-ok')).toHaveCount(3);
    await expect(page.locator('.sg-exam-score .rz-score-big')).toHaveText('2');
  });

  test('справка свёрнута: формула Вайцзеккера и список «выучить»', async ({ page }) => {
    await page.goto('/nuclear/sr/1/');
    const ref = page.locator('details.sg-ref');
    await expect(ref).not.toHaveAttribute('open', /.*/);
    await ref.locator('summary').click();
    await expect(ref).toContainText('Выучить наизусть');
    await expect(ref.locator('.katex').first()).toBeVisible();
  });
});

test.describe('лаборатории', () => {
  test('3.1: энергия связи ⁵⁶Fe по таблице', async ({ page }) => {
    await page.goto('/nuclear/03-binding/');
    const l = await lab(page, '3.1');
    await expect(l.locator('.rz-lab-readout')).toContainText('492.26');
    await expect(l.locator('.rz-lab-readout')).toContainText('8.79');
  });

  test('6.1: ³⁹K — 3/2⁺ и μ = 0.124 по Шмидту, модель совпала с таблицей', async ({ page }) => {
    await page.goto('/nuclear/06-shells/');
    const l = await lab(page, '6.1');
    await expect(l.locator('.rz-lab-readout')).toContainText('3/2+');
    await expect(l.locator('.rz-lab-readout')).toContainText('0.124');
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-ok/);
    await l.getByRole('combobox', { name: 'Ядро из задач' }).selectOption('45-21');
    await expect(l.locator('.rz-lab-readout')).toContainText('7/2−');
    await expect(l.locator('.rz-lab-readout')).toContainText('5.793');
  });

  test('8.2: опыт Резерфорда — 2810 срабатываний под 15°', async ({ page }) => {
    await page.goto('/nuclear/08-rutherford/');
    const l = await lab(page, '8.2');
    await expect(l.locator('.rz-lab-readout')).toContainText(/28[01]\d/);
  });

  test('9.1: по скорости кривые протона и мюона — одна, минимум ионизации около 1.5–2', async ({ page }) => {
    await page.goto('/nuclear/09-ionization/');
    const l = await lab(page, '9.1');
    await l.getByRole('radio', { name: 'скорость βγ' }).click();
    await expect(l.locator('.rz-lab-status')).toContainText('одну кривую');
    await expect(l.locator('.rz-lab-readout')).toContainText(/1\.[5-9]\d/);
  });
});
