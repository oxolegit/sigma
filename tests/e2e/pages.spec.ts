import { expect, test } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';

const seed = () => {
  localStorage.setItem('sigma:tpn:1', '1');
  localStorage.setItem('sigma:tpn:4', '1');
  localStorage.setItem('sigma:last', JSON.stringify({ course: 'tpn', n: 4, title: 'Длина свободного пробега', courseTitle: 'Теория переноса нейтронов', href: '/tpn/04-mfp/' }));
};

test.describe('с сохранённым прогрессом', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(seed); });

  for (const path of ['/', '/tpn/', '/tpn/04-mfp/', '/tpn/exam/', '/tpn/sheet/']) {
    test(`${path}: гидрация без расхождений, без горизонтальной прокрутки`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(path);
      await allHydrated(page);
      const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scroll).toBeLessThanOrEqual(client);
      expect(errors).toEqual([]);
    });
  }

  test('каталог: «Продолжить» ведёт к последнему уроку, прогресс на карточке', async ({ page }) => {
    await page.goto('/');
    await allHydrated(page);
    const cont = page.locator('.sg-continue');
    await expect(cont).toHaveAttribute('href', '/tpn/04-mfp/');
    await expect(cont).toContainText('Продолжить');
    await expect(cont).toContainText('пройдено 2 из 10');
    await expect(page.locator('.rz-course').filter({ hasText: 'Теория переноса нейтронов' }).locator('.rz-progress-num')).toHaveText('2 / 10');
  });

  test('страница курса: отметки в оглавлении и «Продолжить с урока 4»', async ({ page }) => {
    await page.goto('/tpn/');
    await allHydrated(page);
    await expect(page.getByRole('link', { name: 'Продолжить с урока 4' })).toHaveAttribute('href', '/tpn/04-mfp/');
    await expect(page.locator('.sg-outline-mark.is-done')).toHaveCount(2);
    await expect(page.locator('.sg-outline-row.is-current')).toContainText('Длина свободного пробега');
  });
});

test('все написанные уроки курса: без горизонтальной прокрутки, битого TeX и ошибок', async ({ page }) => {
  await page.goto('/tpn/');
  const hrefs = await page.locator('a.sg-outline-row').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(href);
    await allHydrated(page);
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll, `${href}: горизонтальная прокрутка`).toBeLessThanOrEqual(client);
    await expect(page.locator('.rz-tex-raw'), `${href}: битый TeX`).toHaveCount(0);
    expect(errors, `${href}: ошибки`).toEqual([]);
    page.removeAllListeners('pageerror');
  }
});

test.describe('без прогресса', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('каталог: шесть курсов, заглушки помечены, фильтры и поиск работают', async ({ page }) => {
    await page.goto('/');
    await allHydrated(page);
    const cards = page.locator('.rz-course');
    await expect(cards).toHaveCount(6);
    await expect(page.locator('.rz-badge-example')).toHaveCount(5);
    await expect(cards.first()).toContainText('Теория переноса нейтронов');
    await expect(page.locator('.sg-continue')).toContainText('Начать');

    await page.getByRole('radio', { name: '2 семестр' }).click();
    await expect(cards).toHaveCount(3);
    await expect(page.locator('.sg-count')).toHaveText('3 курса');
    await page.getByRole('radio', { name: 'Все' }).click();

    await page.getByLabel('Предмет').selectOption('Вычисления');
    await expect(cards).toHaveCount(2);
    await page.getByLabel('Предмет').selectOption('all');

    await page.getByLabel('Поиск по курсам').fill('монте');
    await expect(cards).toHaveCount(1);
    await page.getByLabel('Поиск по курсам').fill('нет такого');
    await expect(page.locator('.sg-empty')).toBeVisible();
  });

  test('каталог: настоящий курс — ссылка на страницу курса, заглушка — без ссылки', async ({ page }) => {
    await page.goto('/');
    await allHydrated(page);
    await expect(page.locator('.rz-course').filter({ hasText: 'Теория переноса нейтронов' }).getByRole('link')).toHaveAttribute('href', '/tpn/');
    await expect(page.locator('.rz-course').filter({ hasText: 'Теплогидравлика' }).getByRole('link')).toHaveCount(0);
  });

  test('страница курса: оглавление из 10 уроков, ссылка только у написанных', async ({ page }) => {
    await page.goto('/tpn/');
    await allHydrated(page);
    await expect(page.locator('.sg-outline-row')).toHaveCount(10);
    const written = page.locator('a.sg-outline-row');
    const soon = page.locator('span.sg-outline-row.is-soon');
    expect((await written.count()) + (await soon.count())).toBe(10);
    // Без прогресса — «Начать» с первого написанного урока.
    const first = await written.first().getAttribute('href');
    await expect(page.getByRole('link', { name: /^Начать с урока \d+$/ })).toHaveAttribute('href', first!);
    // В разметке подпись (dt) идёт перед числом (dd); число наверху только визуально.
    await expect(page.locator('.sg-course-stats')).toContainText('в контрольной26');
  });

  test('ссылка на прогресс: копируется и переносит прогресс в чистый браузер', async ({ page, context, browser }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/tpn/');
    await allHydrated(page);
    const share = page.getByRole('button', { name: 'Ссылка на мой прогресс' });
    await share.click();
    await expect(page.locator('.sg-share-status')).toContainText('Пока нечего переносить');

    await page.evaluate(() => { localStorage.setItem('sigma:tpn:4', '1'); });
    await page.reload();
    await allHydrated(page);
    await share.click();
    await expect(page.locator('.sg-share-status')).toContainText('Ссылка скопирована');
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/\/#p=tpn\.8$/);

    // Другое «устройство»: новый контекст без прогресса.
    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(new URL(link).pathname + new URL(link).hash);
    await expect(p2.locator('.sg-toast')).toHaveText('Прогресс перенесён: +1 урок');
    await p2.goto('/tpn/');
    await allHydrated(p2);
    await expect(p2.locator('.sg-outline-mark.is-done')).toHaveCount(1);
    await other.close();
  });

  test('контрольная: 26 вопросов и 10 задач, счёт и «Показать решение»', async ({ page }) => {
    await page.goto('/tpn/exam/');
    await allHydrated(page);
    await expect(page.locator('.rz-quiz')).toHaveCount(26);
    await expect(page.locator('.rz-steps')).toHaveCount(10);
    await expect(page.locator('.rz-tex-raw')).toHaveCount(0);

    const q1 = page.locator('.rz-quiz').first();
    await hydrated(q1);
    await q1.getByRole('button', { name: /^В\s*7$/ }).click();
    const q2 = page.locator('.rz-quiz').nth(1);
    await hydrated(q2);
    await q2.getByRole('button', { name: /1\/\(см³·эВ·ср\)/ }).click();
    await expect(page.locator('.rz-score-big')).toHaveText('1');
    await expect(page.locator('.rz-score-of')).toHaveText('из 2 верно');
    await expect(page.locator('.rz-score-left')).toHaveText('осталось 24');

    const task = page.locator('.rz-steps').first();
    await hydrated(task);
    await expect(task.locator('.rz-step')).toHaveCount(0);
    await task.getByRole('button', { name: 'Показать решение' }).click();
    await expect(task.locator('.rz-step')).toHaveCount(1);
    await task.getByRole('button', { name: 'Показать все' }).click();
    await expect(task.locator('.rz-step').last()).toContainText('Вывод.');
  });

  test('шпаргалка: формулы по урокам, при печати без шапки и кнопок', async ({ page }) => {
    await page.goto('/tpn/sheet/');
    await expect(page.locator('.sg-sheet-group')).toHaveCount(8);
    await expect(page.locator('.rz-fcard')).toHaveCount(28);
    await expect(page.locator('.rz-tex-raw')).toHaveCount(0);
    await expect(page.locator('.sg-sheet-group').filter({ hasText: 'Длина свободного пробега' }).getByRole('link', { name: 'к уроку' })).toHaveAttribute('href', '/tpn/04-mfp/');

    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.sg-top')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Распечатать' })).toBeHidden();
    await expect(page.locator('.rz-fcard').first()).toBeVisible();
  });
});
