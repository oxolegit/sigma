import { expect, test } from '@playwright/test';
import { allHydrated, hydrated } from './hydration';

/** Адреса и якоря зашиты в QR-коды сданной методички — менять нельзя. */
const PAGES = [
  { href: '/npyat/09-neutron/', anchors: ['lab-chadwick', 'lab-gamma', 'lab-collision'] },
  { href: '/npyat/19-cp1/', anchors: ['lab-cp1', 'lab-pu-chain', 'lab-pile-3d'] },
] as const;

for (const { href, anchors } of PAGES) {
  test(`${href}: открывается без ошибок, битого TeX и прокрутки вбок`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const res = await page.goto(href);
    expect(res?.status()).toBe(200);
    await allHydrated(page);
    for (const island of await page.locator('astro-island[client="visible"]').all()) await hydrated(island.locator(':scope > *').first());
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll).toBeLessThanOrEqual(client);
    await expect(page.locator('.rz-tex-raw, .katex-error')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  for (const id of anchors) {
    test(`${href}#${id}: якорь есть, прокручивает к лаборатории`, async ({ page }) => {
      await page.goto(`${href}#${id}`);
      const lab = page.locator(`figure#${id}.rz-lab`);
      await expect(lab).toHaveCount(1);
      // Браузер прокрутил к якорю: верх рамки — у верха окна, под шапкой.
      await expect.poll(async () => (await lab.boundingBox())?.y ?? -1).toBeLessThan(200);
      await expect.poll(async () => (await lab.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
    });
  }
}

test('курс: 30 вопросов зачёта, уроки 9 и 19 открыты', async ({ page }) => {
  await page.goto('/npyat/');
  await allHydrated(page);
  await expect(page.locator('.sg-outline .sg-outline-row')).toHaveCount(30);
  const links = await page.locator('a.sg-outline-row').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(links).toEqual(['/npyat/09-neutron/', '/npyat/19-cp1/']);
});

test('каталог и шпаргалка: курс есть, формулы уроков в шпаргалке', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="/npyat/"]').first()).toBeVisible();
  await page.goto('/npyat/sheet/');
  await expect(page.getByText('Масса нейтрона по отдаче H и N')).toBeVisible();
  await expect(page.getByText('Обратный коэффициент умножения')).toBeVisible();
});

test.describe('лаборатории', () => {
  test('9.1: масса 1.15 попадает в полосу; по данным Чедвика m ≈ 1.16', async ({ page }) => {
    await page.goto('/npyat/09-neutron/');
    const lab = await hydrated(page.locator('#lab-chadwick'));
    await expect(lab.locator('.rz-lab-status')).toHaveClass(/is-warn/);
    await lab.getByRole('slider').fill('1.15');
    await expect(lab.locator('.rz-lab-status')).toHaveClass(/is-ok/);
    await expect(lab.locator('.rz-lab-status')).toContainText('Это нейтрон');
    await lab.getByRole('radio', { name: 'по данным' }).click();
    await expect(lab.locator('.rz-lab-readout')).toContainText('1.16');
    await expect(lab.locator('.rz-step')).toHaveCount(4);
  });

  test('9.2: γ требует 55 и 89 МэВ — противоречие', async ({ page }) => {
    await page.goto('/npyat/09-neutron/');
    const lab = await hydrated(page.locator('#lab-gamma'));
    await expect(lab.locator('.rz-lab-readout')).toContainText('54.6');
    await expect(lab.locator('.rz-lab-readout')).toContainText('89');
    await expect(lab.locator('.rz-lab-status')).toContainText('Противоречие');
    await lab.getByRole('radio', { name: 'нейтрон' }).click();
    await expect(lab.locator('.rz-lab-status')).toHaveClass(/is-ok/);
  });

  test('19.1: стержень на 60 % — точка в блокноте Ферми, ZIP глушит', async ({ page }) => {
    await page.goto('/npyat/19-cp1/');
    const lab = await hydrated(page.locator('#lab-cp1'));
    await lab.getByRole('slider').fill('60');
    await expect(lab.locator('.rz-lab-status')).toContainText('записана', { timeout: 15_000 });
    await expect(lab.locator('.rz-lab-readout')).not.toContainText('–');
    await lab.getByRole('button', { name: 'ZIP' }).click();
    await expect(lab.locator('.rz-lab-status')).toContainText('Заглушен');
  });

  test('19.3: 57 слоёв без кадмия — критика, с кадмием — нет', async ({ page }) => {
    await page.goto('/npyat/19-cp1/');
    const lab = await hydrated(page.locator('#lab-pile-3d'));
    await lab.getByRole('slider').fill('57');
    await expect(lab.locator('.rz-lab-readout')).toContainText('1.0006');
    await expect(lab.locator('.rz-lab-status')).toContainText('Кладка критична');
    await lab.getByRole('radio', { name: 'вставлены' }).click();
    await expect(lab.locator('.rz-lab-readout')).toContainText('0.9600');
  });

  test('тренажёры: верный ответ засчитывается', async ({ page }) => {
    await page.goto('/npyat/09-neutron/');
    const t = page.locator('.sg-trainer');
    await hydrated(t.locator('.sg-trainer-head'));
    await t.getByRole('button', { name: 'Подсказка' }).click();
    await t.getByRole('button', { name: 'Показать ответ' }).click();
    const m = await t.locator('.sg-trainer-ans .katex-mathml annotation').first().textContent();
    const value = /=\s*([\d.]+)\\ \\text\{а\.е\.м\.\}\s*$/.exec(m ?? '')?.[1];
    expect(value).toBeTruthy();
    await t.getByRole('textbox').fill(value!.replace('.', ','));
    await t.getByRole('button', { name: 'Проверить' }).click();
    await expect(t.locator('.rz-quiz-explain.is-correct')).toBeVisible();
  });
});
