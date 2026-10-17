import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { courseHref, examHref, getCourse, sheetHref } from '../lib/courses';

/** Карта сайта: главная, страницы настоящих курсов, их уроки, контрольные, самостоятельные и шпаргалки. */
export const GET: APIRoute = async ({ site }) => {
  const paths = ['/'];
  for (const c of (await getCollection('courses')).filter((x) => !x.data.example)) {
    const d = await getCourse(c.id);
    paths.push(courseHref(c.id), ...d.lessons.filter((l) => l.href).map((l) => l.href!));
    if (d.exam) paths.push(examHref(c.id));
    paths.push(...d.works.map((w) => w.href), ...d.preps.map((p) => p.href));
    if (d.lessons.some((l) => l.formulas.length)) paths.push(sheetHref(c.id));
  }
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
