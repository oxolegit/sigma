import { expect, type Locator, type Page } from '@playwright/test';

/** Ждёт, пока остров Astro, внутри которого лежит элемент, гидрируется (у astro-island пропадает атрибут ssr).
 *  Без этого клик может прийти в серверную разметку раньше, чем React навесит обработчики. */
export async function hydrated(target: Locator): Promise<Locator> {
  await target.scrollIntoViewIfNeeded();
  // client:visible грузит чанк острова только при появлении в кадре; под нагрузкой параллельных воркеров это бывает дольше 5 с.
  await expect(target.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', /.*/, { timeout: 15_000 });
  return target;
}

/** Ждёт гидрации всех островов страницы, которые грузятся без прокрутки (client:load / client:idle). */
export async function allHydrated(page: Page) {
  await expect(page.locator('astro-island[ssr]:not([client="visible"])')).toHaveCount(0);
}
