import { expect, test, type Page } from '@playwright/test';
import { hydrated } from './hydration';

/** Лаборатория по номеру на странице урока, уже гидрированная. */
async function lab(page: Page, n: string) {
  return hydrated(page.locator('.rz-lab').filter({ hasText: `Лаборатория ${n}` }));
}

test.describe('урок 1', () => {
  test('1.1: при 1 МэВ ƛ сравнима с ядром, в среде нейтрон — частица', async ({ page }) => {
    await page.goto('/tpn/01-neutron/');
    const l = await lab(page, '1.1');
    await expect(l.locator('.rz-lab-readout')).toContainText('тепловой');
    await l.getByRole('slider', { name: /Энергия нейтрона/ }).fill('6');
    await expect(l.locator('.rz-lab-readout')).toContainText('быстрый');
    await expect(l.locator('.rz-lab-status')).toContainText('сравнима с R');
    await expect(l.locator('.rz-lab-status')).toContainText('точечная частица');
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-ok/);
  });
});

test.describe('урок 3', () => {
  test('3.1: у лёгкого ядра в легенде только полное сечение и захват', async ({ page }) => {
    await page.goto('/tpn/03-cross-sections/');
    const l = await lab(page, '3.1');
    await expect(l.locator('.rz-lab-legend li')).toHaveCount(4);
    await l.getByRole('radio', { name: /Лёгкое/ }).click();
    await expect(l.locator('.rz-lab-legend li')).toHaveCount(2);
  });

  test('3.2: UO₂ 4 % — числа задачи Б3, графит — приложение 2', async ({ page }) => {
    await page.goto('/tpn/03-cross-sections/');
    const l = await lab(page, '3.2');
    await expect(l.locator('tfoot')).toContainText('0.700');
    await expect(l.locator('.rz-lab-readout')).toContainText('1.09');
    await expect(l.locator('.rz-lab-status')).toContainText('неприменимо');
    await l.getByLabel('Материал').selectOption('c');
    await expect(l.locator('tbody tr')).toHaveCount(1);
    await expect(l.locator('tfoot')).toContainText('2.73·10⁻⁴');
    await expect(l.locator('tfoot')).toContainText('0.381');
    await expect(l.getByRole('slider')).toHaveCount(0);
  });
});

test.describe('урок 2', () => {
  test.use({ reducedMotion: 'reduce' });

  test('2.1: ²³⁹Pu делится любыми нейтронами, ²³⁸U — только выше порога', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.1');
    await expect(l.locator('.rz-lab-status')).toContainText('Не делится');
    await l.getByRole('slider', { name: /Кинетическая энергия/ }).fill('1.5');
    await expect(l.locator('.rz-lab-status')).toContainText('Деление пороговое');
    await l.getByLabel('Ядро-мишень').selectOption('pu239');
    await expect(l.locator('.rz-lab-status')).toContainText('любых энергий');
  });

  test('2.2: ²³⁸U при 0.3 МэВ — захват, ²³⁵U — деление', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.2');
    await l.getByRole('button', { name: 'Запустить нейтрон' }).click();
    await expect(l.locator('.rz-lab-status')).toContainText('Радиационный захват');
    await expect(l.locator('.rz-lab-readout')).toContainText('радиационный захват');
    await l.getByLabel('Ядро-мишень').selectOption('u235');
    await l.getByRole('button', { name: 'Запустить нейтрон' }).click();
    await expect(l.locator('.rz-lab-status')).toContainText('Деление');
    await expect(l.locator('.rz-lab-readout')).toContainText(/деление, ν = [2-4]/);
  });

  test('2.3: выше 1 МэВ около 70 %, выше 12 МэВ — сотые доли процента', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.3');
    await expect(l.locator('.rz-lab-readout')).toContainText('68.9');
    await l.getByRole('slider', { name: /Порог/ }).fill('12');
    await expect(l.locator('.rz-lab-readout')).toContainText('0.02');
  });
});
