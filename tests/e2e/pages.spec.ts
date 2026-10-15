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

  test('главная: только настоящие курсы, без заглушек; с четырёх курсов — фильтры', async ({ page }) => {
    await page.goto('/');
    await allHydrated(page);
    const cards = page.locator('.rz-course');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('.rz-badge-example')).toHaveCount(0);
    await expect(page.locator('.sg-filters')).toHaveCount(1);
    await expect(cards.filter({ hasText: 'Теория переноса нейтронов' }).getByRole('link')).toHaveAttribute('href', '/tpn/');
    await expect(cards.filter({ hasText: 'Математический анализ' }).getByRole('link')).toHaveAttribute('href', '/math/');
    await expect(cards.filter({ hasText: 'Математическая статистика' }).getByRole('link')).toHaveAttribute('href', '/stats/');
    await expect(cards.filter({ hasText: 'Ядерная физика' }).getByRole('link')).toHaveAttribute('href', '/nuclear/');
    await expect(page.locator('.sg-continue')).toContainText('Начать');
    await page.locator('.sg-filters select').selectOption('Физика');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Ядерная физика');
  });

  test('главная: цифры посчитаны по контенту, ссылки на курс и GitHub, живая лаборатория', async ({ page }) => {
    await page.goto('/');
    // Цифры растут с каждым уроком — проверяем, что они не меньше готового на сегодня.
    const numbers = page.locator('.sg-number');
    const value = async (word: RegExp) => Number(await numbers.filter({ hasText: word }).locator('dd').textContent());
    expect(await value(/урок/)).toBeGreaterThanOrEqual(11);
    expect(await value(/лаборатор/)).toBeGreaterThanOrEqual(26);
    expect(await value(/самопроверк/)).toBeGreaterThanOrEqual(60);
    await expect(page.locator('.sg-hero').getByRole('link', { name: 'Выбрать курс' })).toHaveAttribute('href', '#courses');
    await expect(page.locator('.sg-hero').getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/oxolegit/sigma');
    await expect(page.locator('.sg-foot').getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/oxolegit/sigma');
    const demo = await hydrated(page.locator('.rz-lab').filter({ hasText: 'Лаборатория 4.3' }));
    await expect(demo.locator('.rz-lab-readout')).toBeVisible();
  });

  test('мета-теги: canonical, Open Graph с абсолютной картинкой, карта сайта и robots', async ({ page, request }) => {
    for (const [path, type] of [['/', 'website'], ['/tpn/04-mfp/', 'article']] as const) {
      await page.goto(path);
      const meta = (sel: string) => page.locator(sel).getAttribute('content');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sigma.mslv.space${path}`);
      expect(await meta('meta[property="og:type"]')).toBe(type);
      expect(await meta('meta[property="og:image"]')).toBe('https://sigma.mslv.space/og.png');
      expect(await meta('meta[property="og:title"]')).toBe(await page.title());
      expect((await meta('meta[name="description"]'))!.length).toBeGreaterThan(50);
      expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    }
    const og = await request.get('/og.png');
    expect(og.headers()['content-type']).toBe('image/png');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://sigma.mslv.space/tpn/10-ensemble/</loc>');
    expect(sitemap).not.toContain('/dev/');
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://sigma.mslv.space/sitemap.xml');
    await page.goto('/dev/components/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
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
    // Число формул растёт с каждым перенесённым уроком: проверяем, что у каждого урока в шпаргалке они есть.
    const groups = page.locator('.sg-sheet-group');
    expect(await groups.count()).toBeGreaterThanOrEqual(8);
    for (const g of await groups.all()) expect(await g.locator('.rz-fcard').count()).toBeGreaterThan(0);
    const cards = await page.locator('.rz-fcard').count();
    await expect(page.locator('.sg-sheet-text p')).toContainText(`${cards} формул`);
    await expect(page.locator('.rz-tex-raw')).toHaveCount(0);
    await expect(page.locator('.sg-sheet-group').filter({ hasText: 'Длина свободного пробега' }).getByRole('link', { name: 'к уроку' })).toHaveAttribute('href', '/tpn/04-mfp/');

    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.sg-top')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Распечатать' })).toBeHidden();
    await expect(page.locator('.rz-fcard').first()).toBeVisible();
  });
});
