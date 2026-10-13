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
    await l.getByLabel('Материал', { exact: true }).selectOption('c');
    await expect(l.locator('tbody tr')).toHaveCount(1);
    await expect(l.locator('tfoot')).toContainText('2.73·10⁻⁴');
    await expect(l.locator('tfoot')).toContainText('0.381');
    await expect(l.getByRole('slider')).toHaveCount(0);
  });
});

test.describe('урок 5', () => {
  test('5.1: пример из конспекта — числа задачи Б5; встречные пучки — ток ноль', async ({ page }) => {
    await page.goto('/tpn/05-field/');
    const l = await lab(page, '5.1');
    const ro = l.locator('.rz-lab-readout');
    await expect(ro).toContainText('= 5.00');
    await expect(ro).toContainText('= 2.121');
    await expect(ro).toContainText('= 1.586 под 45°');
    await l.getByRole('slider', { name: 'Нормаль площадки' }).fill('45');
    await expect(ro.locator('.rz-readout').nth(3)).toContainText('= 1.586');
    await l.getByRole('radio', { name: 'Встречные' }).click();
    await expect(ro).toContainText('= 2.00');
    await expect(ro.locator('.rz-readout').nth(4)).toContainText('= 0');
  });

  test('5.2: при |b| > 1/3 угловой поток местами отрицателен', async ({ page }) => {
    await page.goto('/tpn/05-field/');
    const l = await lab(page, '5.2');
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-ok/);
    await l.getByRole('slider').fill('0.4');
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-bad/);
  });

  test('5.3: нормаль перпендикулярна току — i⁺ = i⁻ = Φ/4', async ({ page }) => {
    await page.goto('/tpn/05-field/');
    const l = await lab(page, '5.3');
    await l.getByRole('slider', { name: 'Ток: полярный угол' }).fill('0');
    await l.getByRole('slider', { name: 'Нормаль: полярный угол' }).fill('90');
    const ro = l.locator('.rz-lab-readout');
    await expect(ro).toContainText('90°');
    await expect(ro.locator('.rz-readout').nth(0)).toContainText('= 0.250');
    await expect(ro.locator('.rz-readout').nth(2)).toContainText('= 0.000');
  });
});

test.describe('урок 6', () => {
  test('6.1: скорость реакций сохраняется, захват ²³⁸U зависит от спектра на порядки', async ({ page }) => {
    await page.goto('/tpn/06-groups/');
    const l = await lab(page, '6.1');
    const ro = l.locator('.rz-lab-readout');
    await expect(ro).toContainText('1.0000');
    await expect(ro).toContainText('11.2');
    await expect(l.locator('.rz-lab-table tbody tr')).toHaveCount(5);
    await l.getByLabel('Спектр', { exact: true }).selectOption('fast');
    await expect(ro).toContainText('0.17');
    await l.getByRole('radio', { name: '26' }).click();
    await expect(l.locator('.rz-lab-table tbody tr')).toHaveCount(26);
    await l.getByLabel('Сечение', { exact: true }).selectOption('const');
    await expect(ro).toContainText('5.00');
  });
});

test.describe('урок 7', () => {
  test('7.1: графит вдали от границ — Фик применим; крутой градиент даёт отрицательный ток', async ({ page }) => {
    await page.goto('/tpn/07-fick/');
    const l = await lab(page, '7.1');
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-ok/);
    await expect(l.locator('.sg-checklist li.is-ok')).toHaveCount(4);
    await l.getByRole('slider', { name: /Градиент/ }).fill('2');
    await expect(l.locator('.rz-lab-status')).toHaveClass(/is-bad/);
    await expect(l.locator('.rz-lab-readout')).toContainText('= -0.083');
    await l.getByRole('slider', { name: /Градиент/ }).fill('0');
    await l.getByRole('slider', { name: /Массовое число/ }).fill('1');
    await expect(l.locator('.sg-checklist li').first()).toHaveClass(/is-bad/);
  });
});

test.describe('урок 8', () => {
  test('8.1: без экстраполяции ã = a; для толстой пластины выбор d почти не важен', async ({ page }) => {
    await page.goto('/tpn/08-diffusion/');
    const l = await lab(page, '8.1');
    const ro = l.locator('.rz-lab-readout');
    await expect(ro).toContainText('= 7.42');
    await l.getByRole('radio', { name: '0', exact: true }).click();
    await expect(ro).toContainText('= 6.00');
    await expect(ro).toContainText('= 1.000');
    await l.getByRole('radio', { name: '0.71 λtr' }).click();
    await l.getByRole('slider').fill('30');
    await expect(ro.locator('.rz-readout').nth(1)).toContainText('= 0.9');
  });

  test('8.2: Монте-Карло даёт ⟨r²⟩ близко к 6L² и Σt/Σa столкновений', async ({ page }) => {
    await page.goto('/tpn/08-diffusion/');
    const l = await lab(page, '8.2');
    const ro = l.locator('.rz-lab-readout');
    await expect(ro).toContainText('запустите');
    await l.getByRole('button', { name: 'Запустить 3000 историй' }).click();
    await expect(ro).toContainText('(теория 21.0)');
    const pct = Number((await ro.locator('.rz-readout').nth(3).textContent())!.match(/\(([+-]?[\d.]+) %\)/)![1]);
    expect(Math.abs(pct)).toBeLessThan(8);
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
    await l.getByLabel('Ядро-мишень', { exact: true }).selectOption('pu239');
    await expect(l.locator('.rz-lab-status')).toContainText('любых энергий');
  });

  test('2.2: ²³⁸U при 0.3 МэВ — захват, ²³⁵U — деление', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.2');
    await l.getByRole('button', { name: 'Запустить нейтрон' }).click();
    await expect(l.locator('.rz-lab-status')).toContainText('Радиационный захват');
    await expect(l.locator('.rz-lab-readout')).toContainText('радиационный захват');
    await l.getByLabel('Ядро-мишень', { exact: true }).selectOption('u235');
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
