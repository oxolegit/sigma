import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { NavLesson } from '../components';

export interface OutlineLesson { n: number; title: string; ref?: string; chapter: string; href?: string; entry?: CollectionEntry<'lessons'> }
export interface CourseData {
  id: string;
  course: CollectionEntry<'courses'>;
  lessons: OutlineLesson[];
  chapters: { title: string; lessons: NavLesson[] }[];
}

export const lessonSlug = (entry: CollectionEntry<'lessons'>) => entry.id.split('/')[1]!;
export const lessonHref = (course: string, entry: CollectionEntry<'lessons'>) => `/${course}/${lessonSlug(entry)}/`;

/** Курс с оглавлением, в котором у написанных уроков есть ссылка. Проверяет, что каждый урок есть в оглавлении. */
export async function getCourse(id: string): Promise<CourseData> {
  const course = await getEntry('courses', id);
  if (!course) throw new Error(`Курс «${id}» не найден в src/content/courses`);
  const written = (await getCollection('lessons')).filter((l) => l.id.startsWith(`${id}/`));

  const lessons: OutlineLesson[] = [];
  const chapters = course.data.chapters.map((ch) => {
    const chapter = ch.n ? `Глава ${ch.n} · ${ch.title}` : ch.title;
    return {
      title: chapter,
      lessons: ch.lessons.map((l) => {
        const entry = written.find((w) => w.data.n === l.n);
        const href = entry ? lessonHref(id, entry) : undefined;
        lessons.push({ ...l, chapter, href, entry });
        return { n: l.n, title: l.title, ref: l.ref, href };
      }),
    };
  });

  for (const w of written) {
    if (!lessons.some((l) => l.n === w.data.n)) {
      throw new Error(`Урок ${w.id}: номера ${w.data.n} нет в оглавлении курса «${id}»`);
    }
  }
  return { id, course, lessons, chapters };
}

/** Число лабораторий и вопросов урока — по исходнику MDX. */
export function lessonStats(entry: CollectionEntry<'lessons'>) {
  const body = entry.body ?? '';
  return {
    labs: (body.match(/^import\s+\w+\s+from\s+['"]@labs\//gm) ?? []).length,
    questions: (body.match(/<Quiz\b/g) ?? []).length,
  };
}
