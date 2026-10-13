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

test.describe('урок 9', () => {
  test('9.2: при kR = 0.2 одна s-волна и σ ≈ 4πR², при kR = 5 — к 2πR²', async ({ page }) => {
    await page.goto('/tpn/09-quantum/');
    const l = await lab(page, '9.2');
    const ro = l.locator('.rz-lab-readout');
    await l.getByRole('slider').fill('0.2');
    await expect(ro.locator('.rz-readout').nth(1)).toContainText('1');
    await expect(ro.locator('.rz-readout').nth(0)).toContainText('= 3.9');
    await l.getByRole('slider').fill('5');
    await expect(ro.locator('.rz-readout').nth(0)).toContainText('= 2.');
  });

  test('9.3: без нагрева пик и площадь не меняются, при нагреве пик падает, площадь та же', async ({ page }) => {
    await page.goto('/tpn/09-quantum/');
    const l = await lab(page, '9.3');
    const area = l.locator('.rz-readout').nth(3);
    const [a0, a1] = (await area.locator('.rz-readout-v').textContent())!.split(' / ').map(Number);
    expect(Math.abs(a0! - a1!) / a0!).toBeLessThan(0.02);
    await l.getByRole('slider', { name: /Температура/ }).fill('0');
    await expect(l.locator('.rz-readout').nth(4)).toContainText('= 0');
  });

  test('9.4: по Пуассону близких пар заметно больше, чем по Вигнеру', async ({ page }) => {
    await page.goto('/tpn/09-quantum/');
    const l = await lab(page, '9.4');
    const close = async () => Number((await l.locator('.rz-readout').nth(1).locator('.rz-readout-v').textContent())!.replace(/[^\d.]/g, ''));
    expect(await close()).toBeLessThan(8);
    await l.getByRole('radio', { name: 'Пуассон' }).click();
    await expect.poll(close).toBeGreaterThan(10);
  });

  test('9.5: ¹⁰B — почти каждый тепловой нейтрон даёт (n, α)', async ({ page }) => {
    await page.goto('/tpn/09-quantum/');
    const l = await lab(page, '9.5');
    await l.getByLabel('Ядро-мишень', { exact: true }).selectOption('b10');
    await l.getByRole('button', { name: '+1000 без анимации' }).click();
    // ru-RU группирует разряды неразрывным пробелом: «1 000».
    await expect(l.locator('.rz-lab-readout')).toContainText(/1\s000/);
    const alpha = l.locator('.sg-channels li').filter({ hasText: '(n, α)' });
    await expect(alpha).toContainText(/наблюдение (99\.\d|100\.0) %/);
  });
});

test.describe('урок 10', () => {
  test('10.1: при μ = 100 разброс √μ, относительная ошибка 10 %', async ({ page }) => {
    await page.goto('/tpn/10-ensemble/');
    const l = await lab(page, '10.1');
    await l.getByRole('slider').fill('2');
    const ro = l.locator('.rz-lab-readout .rz-readout-v');
    await expect(ro.nth(2)).toContainText('= 10.00');
    const mean = Number(await ro.nth(0).textContent());
    expect(Math.abs(mean - 100)).toBeLessThan(1.5);
    const sd = Number(await ro.nth(1).textContent());
    expect(sd).toBeGreaterThan(0.9);
    expect(sd).toBeLessThan(1.1);
  });

  test('10.2: тепловая точка — kT = 0.0253 эВ, V_T = 2200 м/с; при 4T₀ σ̄ вдвое меньше', async ({ page }) => {
    await page.goto('/tpn/10-ensemble/');
    const l = await lab(page, '10.2');
    const ro = l.locator('.rz-lab-readout');
    await expect(ro).toContainText('0.0253');
    await expect(ro).toContainText(/2\s200/);
    await expect(ro).toContainText('= 0.886');
    await l.getByRole('slider').fill('1174');
    await expect(ro).toContainText('= 0.443');
  });

  test('10.3: за 10 с счёта односторонние токи близки к Φ/4', async ({ page }) => {
    await page.goto('/tpn/10-ensemble/');
    const l = await lab(page, '10.3');
    await l.getByRole('button', { name: '+10 с без анимации' }).click();
    const ro = l.locator('.rz-lab-readout .rz-readout-v');
    for (const i of [2, 3]) {
      const v = Number((await ro.nth(i).textContent())!.match(/= ([\d.]+)/)![1]);
      expect(v).toBeGreaterThan(0.2);
      expect(v).toBeLessThan(0.3);
    }
  });

  test('10.4: при k = 1.05 угасает около 95 %, при k = 0.8 — все', async ({ page }) => {
    await page.goto('/tpn/10-ensemble/');
    const l = await lab(page, '10.4');
    const ro = l.locator('.rz-lab-readout .rz-readout-v');
    await expect(ro.nth(1)).toHaveText('94.9 %');
    await l.getByRole('button', { name: 'Оценить по 5000 цепочек' }).click();
    const mc = Number((await ro.nth(3).textContent())!.replace(/[^\d.]/g, ''));
    expect(Math.abs(mc - 94.9)).toBeLessThan(1.5);
    await l.getByRole('slider').fill('0.8');
    await expect(ro.nth(1)).toHaveText('100.0 %');
    await expect(ro.nth(2)).toHaveText('40');
  });
});

test.describe('урок 2', () => {
  test.use({ reducedMotion: 'reduce' });

  test('2.1: ²³⁹Pu делится любыми нейтронами, ²³⁸U — только выше порога', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.1');
    await expect(l.locator('.rz-lab-status')).toContainText('Не делится');
    // Столбцы баланса энергий: сумма E* и нехватка до барьера.
    const bars = l.locator('canvas');
    await expect(bars).toHaveAttribute('aria-label', /4\.76 \+ 0\.30 = 5\.06 МэВ.*не хватает 0\.74/);
    await l.getByRole('slider', { name: /Кинетическая энергия/ }).fill('1.5');
    await expect(l.locator('.rz-lab-status')).toContainText('Деление пороговое');
    await expect(bars).toHaveAttribute('aria-label', /запас 0\.46/);
    await l.getByLabel('Ядро-мишень', { exact: true }).selectOption('pu239');
    await expect(l.locator('.rz-lab-status')).toContainText('любых энергий');
  });

  test('2.2: ²³⁸U при 0.3 МэВ — захват, ²³⁵U — деление', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.2');
    await l.getByRole('button', { name: 'Запустить нейтрон' }).click();
    await expect(l.locator('.rz-lab-status')).toContainText('Радиационный захват');
    await expect(l.locator('.rz-lab-readout')).toContainText('радиационный захват');
    // Точка на V(ε) остановилась до барьера (ε = 0.72).
    const pot = l.locator('canvas[aria-label^="Энергия деформации"]');
    const at = async () => Number((await pot.getAttribute('aria-label'))!.match(/деформация ([\d.]+)/)![1]);
    expect(await at()).toBeGreaterThan(0.3);
    expect(await at()).toBeLessThan(0.72);
    await l.getByLabel('Ядро-мишень', { exact: true }).selectOption('u235');
    await l.getByRole('button', { name: 'Запустить нейтрон' }).click();
    await expect(l.locator('.rz-lab-status')).toContainText('Деление');
    await expect(l.locator('.rz-lab-readout')).toContainText(/деление, ν = [2-4]/);
    await expect(pot).toHaveAttribute('aria-label', /деформация 1\.00/);
  });

  test('2.3: выше 1 МэВ около 70 %, выше 12 МэВ — сотые доли процента', async ({ page }) => {
    await page.goto('/tpn/02-fission/');
    const l = await lab(page, '2.3');
    await expect(l.locator('.rz-lab-readout')).toContainText('68.9');
    await l.getByRole('slider', { name: /Порог/ }).fill('12');
    await expect(l.locator('.rz-lab-readout')).toContainText('0.02');
  });
});
