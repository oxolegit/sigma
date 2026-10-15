import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getCourse, sheetHref } from '../lib/courses';
import { normTex, type FormulaIndex } from '../lib/formulas';

/**
 * Индекс формул для попапа: подробные записи из src/content/formulas,
 * места, где каждая выносная формула встречается (уроки и шпаргалки), и названия из шпаргалок.
 */
export const GET: APIRoute = async () => {
  const index: FormulaIndex = { items: [], places: {}, names: {} };
  const add = (tex: string, place: { title: string; href: string }) => {
    const k = normTex(tex);
    const list = (index.places[k] ??= []);
    if (!list.some((p) => p.href === place.href)) list.push(place);
  };

  for (const f of await getCollection('formulas')) {
    for (const it of f.data.items) index.items.push({ ...it, course: f.id });
  }

  const courses = (await getCollection('courses')).filter((c) => !c.data.example);
  for (const c of courses) {
    const d = await getCourse(c.id);
    for (const l of d.lessons) {
      const where = { title: `${c.data.title} · урок ${l.n}. ${l.title}`, href: l.href ?? sheetHref(c.id) };
      for (const f of l.formulas) {
        index.names[normTex(f.tex)] = f.title;
        add(f.tex, { title: `${c.data.title} · шпаргалка`, href: sheetHref(c.id) });
        if (l.href) add(f.tex, where);
      }
      for (const m of (l.entry?.body ?? '').matchAll(/\$\$\s*([\s\S]+?)\s*\$\$/g)) add(m[1]!, where);
    }
  }
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
