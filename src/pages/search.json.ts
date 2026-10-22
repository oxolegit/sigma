import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { SearchItem } from '../components/live/SearchDialog';
import { courseHref, getCourse, lessonLabs, sheetHref } from '../lib/courses';

/** Индекс поиска по сайту: курсы, уроки с «Что спросят», лаборатории и формулы шпаргалок. */
export const GET: APIRoute = async () => {
  const items: SearchItem[] = [];
  const courses = (await getCollection('courses')).filter((c) => !c.data.example);
  for (const c of courses) {
    const d = await getCourse(c.id);
    const course = c.data.title;
    items.push({ type: 'course', title: course, sub: [c.data.subject, c.data.semester].filter(Boolean).join(' · '), href: courseHref(c.id), text: `${c.data.source ?? ''} ${c.data.description ?? ''}` });
    for (const l of d.lessons) {
      if (!l.href || !l.entry) continue;
      items.push({ type: 'lesson', title: `${l.n}. ${l.title}`, sub: course, href: l.href, text: [l.ref, l.entry.data.lead, ...l.entry.data.ask].filter(Boolean).join(' ') });
      for (const lab of lessonLabs(l.entry)) {
        items.push({ type: 'lab', title: `${lab.n}. ${lab.title}`, sub: `${course} · урок ${l.n}`, href: `${l.href}#${lab.id}` });
      }
    }
    for (const l of d.lessons) {
      for (const f of l.formulas) {
        items.push({ type: 'formula', title: f.title, sub: `${course} · урок ${l.n}`, href: l.href ?? sheetHref(c.id), text: f.tex, tex: f.tex });
      }
    }
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
