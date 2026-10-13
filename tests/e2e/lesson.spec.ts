import { expect, test, type Page } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';

const LESSON = '/tpn/04-mfp/';

/** Прокрутить страницу целиком, чтобы проснулись все острова client:visible. */
async function wakeAll(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.evaluate(() => window.scrollTo(0, 0));
}

const visibleNav = (page: Page) => page.locator('.rz-nav:visible');

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await allHydrated(page);
});

test('урок собран из оглавления курса и MDX', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Длина свободного пробега');
  await expect(page.locator('.sg-eyebrow-accent')).toHaveText('Урок 4 · §1.6 · Глава 1');
  await expect(page.locator('.sg-lesson-meta')).toHaveText('≈ 25 минут · 3 лаборатории · 4 вопроса в конце');
  await expect(page.locator('.rz-ask li')).toHaveCount(4);
  await expect(page.locator('.rz-tex-raw')).toHaveCount(0);
  await expect(visibleNav(page).locator('[aria-current="page"]')).toContainText('Длина свободного пробега');
  // Все 10 уроков в оглавлении; ненаписанные — не ссылки, а приглушённые пункты.
  const nav = visibleNav(page);
  const links = await nav.locator('a.rz-nav-item').count();
  const soon = await nav.locator('.rz-nav-item.is-soon').count();
  expect(links).toBeGreaterThan(0);
  expect(links + soon).toBe(10);
  await expect(nav.locator('.is-soon[href]')).toHaveCount(0);
});

test('нет горизонтальной прокрутки и ошибок в консоли', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await wakeAll(page);
  const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(scroll).toBeLessThanOrEqual(client);
  expect(errors).toEqual([]);
});

test('лента уроков на телефоне центрирует текущий урок, не прокручивая страницу', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) > 700, 'лента — только на узком экране');
  // Чанк ленты приходит с задержкой: читатель успевает прокрутить страницу до её гидрации.
  await page.route('**/_astro/*LessonNav*.js', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await page.goto('/tpn/08-diffusion/');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await allHydrated(page);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
  const [strip, cur] = await page.evaluate(() => {
    const s = document.querySelector('.rz-nav-strip')!;
    const r = (e: Element) => { const b = e.getBoundingClientRect(); return [b.left, b.right]; };
    return [r(s), r(s.querySelector('[aria-current="page"]')!)];
  });
  expect(cur[0]).toBeGreaterThanOrEqual(strip[0]! - 1);
  expect(cur[1]).toBeLessThanOrEqual(strip[1]! + 1);
});

test('«Урок пройден» отмечает урок в оглавлении и прогрессе и переживает перезагрузку', async ({ page }) => {
  await wakeAll(page);
  await page.getByRole('button', { name: 'Урок пройден' }).click();
  await expect(page.getByRole('button', { name: '✓ Урок пройден' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sg-top .rz-progress-num')).toHaveText('1 / 10');
  await expect(visibleNav(page).locator('.is-current .rz-nav-n')).toHaveText('✓');

  await page.reload();
  await allHydrated(page);
  await expect(page.locator('.sg-top .rz-progress-num')).toHaveText('1 / 10');
  expect(await page.evaluate(() => localStorage.getItem('sigma:tpn:4'))).toBe('1');

  await wakeAll(page);
  await page.getByRole('button', { name: '✓ Урок пройден' }).click();
  await expect(page.locator('.sg-top .rz-progress-num')).toHaveText('0 / 10');
});

test('ссылка #p=… переносит прогресс и убирает хэш из адреса', async ({ page }) => {
  await page.goto(`${LESSON}#p=tpn.9`); // уроки 1 и 4
  await expect(page.locator('.sg-toast')).toHaveText('Прогресс перенесён: +2 урока');
  await expect(page.locator('.sg-top .rz-progress-num')).toHaveText('2 / 10');
  expect(new URL(page.url()).hash).toBe('');
  expect(await page.evaluate(() => [localStorage.getItem('sigma:tpn:1'), localStorage.getItem('sigma:tpn:4')])).toEqual(['1', '1']);
});

test('лаборатория 4.1: ползунок Σ меняет λ, шкала переключается', async ({ page }) => {
  const lab = page.locator('.rz-lab').filter({ hasText: 'Лаборатория 4.1' });
  await hydrated(lab);
  await expect(lab.locator('.rz-lab-readout')).toContainText('2.50');
  await lab.locator('input[type=range]').first().fill('0.5');
  await expect(lab.locator('.rz-lab-readout')).toContainText('2.00');
  await lab.getByRole('radio', { name: 'Логарифм' }).click();
  await expect(lab.getByRole('radio', { name: 'Логарифм' })).toHaveAttribute('aria-checked', 'true');
});

test('лаборатория 4.2: нейтроны добавляются, средний пробег близок к λ', async ({ page }) => {
  const lab = page.locator('.rz-lab').filter({ hasText: 'Лаборатория 4.2' });
  await hydrated(lab);
  await expect(lab.locator('.rz-lab-readout')).toContainText('нейтронов300');
  await lab.getByRole('button', { name: '+ 5000' }).click();
  await expect(lab.locator('.rz-lab-readout')).toContainText('нейтронов5300');
  const mean = Number(await lab.locator('.rz-readout').nth(1).locator('.rz-readout-v').textContent());
  expect(mean).toBeGreaterThan(1.85);
  expect(mean).toBeLessThan(2.15);
});

test('лаборатория 4.3: считает исходы, колесо без Ctrl прокручивает страницу', async ({ page }) => {
  const lab = page.locator('.rz-lab').filter({ hasText: 'Лаборатория 4.3' });
  await hydrated(lab);
  const readout = lab.locator('.rz-lab-readout');
  await expect(readout).toContainText(/историй\s*300$/);
  await lab.getByRole('button', { name: '+ 20 000 без треков' }).click();
  await expect(readout).toContainText(/историй\s*20\s300$/);

  const scene = lab.locator('.sg-scene');
  const box = (await scene.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test('у каждой лаборатории легенда в цветах темы, подписи не называют цвета', async ({ page }) => {
  await wakeAll(page);
  const labs = page.locator('.rz-lab');
  const count = await labs.count();
  expect(count).toBe(3);
  for (let i = 0; i < count; i++) {
    const lab = labs.nth(i);
    await hydrated(lab);
    await expect(lab.locator('.rz-lab-legend li')).not.toHaveCount(0);
    // Цвет знака в легенде совпадает с токеном текущей темы — тем же, которым нарисована серия.
    const mismatches = await lab.locator('.rz-legend-mark').evaluateAll((marks) => marks.flatMap((m) => {
      const name = m.getAttribute('data-token');
      const probe = document.createElement('span');
      probe.style.color = `var(--${name})`;
      document.body.append(probe);
      const want = getComputedStyle(probe).color;
      probe.remove();
      const shape = m.firstElementChild;
      const got = shape ? getComputedStyle(shape).stroke : 'нет фигуры';
      return name && got === want ? [] : [`${name}: ${got} ≠ ${want}`];
    }));
    expect(mismatches).toEqual([]);
    // Смысл цветов — только в легенде: подпись не должна описывать треки цветами.
    await expect(lab.locator('.rz-lab-caption')).not.toContainText(/мандарин|фиолет|оранж|зел[её]н|красн|син[иеяй]|сер(ые|ый|ая)/i);
  }
});

test('лаборатория 4.3: пункт легенды скрывает и показывает треки своего исхода', async ({ page }) => {
  const lab = page.locator('.rz-lab').filter({ hasText: 'Лаборатория 4.3' });
  await hydrated(lab);
  const items = lab.locator('.rz-lab-legend button');
  await expect(items).toHaveText([/прошли без столкновений/, /прошли после рассеяний/, /отразились назад/, /поглотились/]);
  const reflected = items.filter({ hasText: 'отразились назад' });
  await expect(reflected).toHaveAttribute('aria-pressed', 'true');
  await reflected.click();
  await expect(reflected).toHaveAttribute('aria-pressed', 'false');
  await reflected.click();
  await expect(reflected).toHaveAttribute('aria-pressed', 'true');
});

test('проверка: ответ на вопрос показывает объяснение', async ({ page }) => {
  const quiz = page.locator('.rz-quiz').nth(2);
  await hydrated(quiz);
  await quiz.getByRole('button', { name: /2 см/ }).click();
  await expect(quiz.getByRole('status')).toContainText('Верно.');
});
