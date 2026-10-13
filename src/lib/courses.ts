import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { NavLesson } from '../components';

type Formula = { title: string; tex: string; note?: string };

export interface OutlineLesson {
  n: number; title: string; ref?: string; chapter: string; href?: string;
  entry?: CollectionEntry<'lessons'>;
  formulas: Formula[];
}
export interface CourseData {
  id: string;
  course: CollectionEntry<'courses'>;
  lessons: OutlineLesson[];
  chapters: { title: string; label: string; name: string; lessons: NavLesson[] }[];
  exam?: CollectionEntry<'exams'>;
  labs: number;
}

export const lessonSlug = (entry: CollectionEntry<'lessons'>) => entry.id.split('/')[1]!;
export const lessonHref = (course: string, entry: CollectionEntry<'lessons'>) => `/${course}/${lessonSlug(entry)}/`;
export const courseHref = (course: string) => `/${course}/`;
export const examHref = (course: string) => `/${course}/exam/`;
export const sheetHref = (course: string) => `/${course}/sheet/`;

/** Число лабораторий и вопросов урока — по исходнику MDX. */
export function lessonStats(entry: { body?: string }) {
  const body = entry.body ?? '';
  return {
    labs: (body.match(/^import\s+\w+\s+from\s+['"]@labs\//gm) ?? []).length,
    questions: (body.match(/<(?:Exam)?Quiz\b/g) ?? []).length,
  };
}

/**
 * Курс с оглавлением, ссылками на написанные уроки, контрольной и формулами для шпаргалки.
 * Роняет сборку, если урока нет в оглавлении или его формулы заданы дважды.
 */
export async function getCourse(id: string): Promise<CourseData> {
  const course = await getEntry('courses', id);
  if (!course) throw new Error(`Курс «${id}» не найден в src/content/courses`);
  const written = (await getCollection('lessons')).filter((l) => l.id.startsWith(`${id}/`));
  // Через коллекцию, а не getEntry: у курсов без контрольной getEntry шумит предупреждениями.
  const exam = (await getCollection('exams')).find((e) => e.id === id);

  const lessons: OutlineLesson[] = [];
  const chapters = course.data.chapters.map((ch) => {
    // У глав без номера («Дополнения») метки нет — иначе название повторится дважды.
    const label = ch.n ? `Глава ${ch.n}` : '';
    const title = ch.n ? `${label} · ${ch.title}` : ch.title;
    return {
      title, label, name: ch.title,
      lessons: ch.lessons.map((l) => {
        const entry = written.find((w) => w.data.n === l.n);
        if (entry && l.formulas.length && entry.data.formulas.length) {
          throw new Error(`Урок ${entry.id}: формулы заданы и в уроке, и в оглавлении курса — оставьте их в уроке`);
        }
        const href = entry ? lessonHref(id, entry) : undefined;
        lessons.push({ n: l.n, title: l.title, ref: l.ref, chapter: title, href, entry, formulas: entry?.data.formulas.length ? entry.data.formulas : l.formulas });
        return { n: l.n, title: l.title, ref: l.ref, href };
      }),
    };
  });

  for (const w of written) {
    if (!lessons.some((l) => l.n === w.data.n)) {
      throw new Error(`Урок ${w.id}: номера ${w.data.n} нет в оглавлении курса «${id}»`);
    }
  }
  const labs = course.data.example
    ? course.data.labs ?? 0
    : written.reduce((sum, w) => sum + lessonStats(w).labs, 0);
  return { id, course, lessons, chapters, exam, labs };
}

/** Исходники лабораторий: по ним видно, какие из них трёхмерные (kind="3D" в LabFrame). */
const LAB_SOURCES = import.meta.glob('../labs/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const isLab3D = (path: string) => Object.entries(LAB_SOURCES).some(([p, src]) => p.endsWith(`/labs/${path}.tsx`) && /kind="3D"/.test(src));

/** Цифры для главной — считаются по контенту, а не пишутся руками. */
export async function siteStats() {
  const courses = (await getCollection('courses')).filter((c) => !c.data.example);
  let lessons = 0, labs = 0, labs3d = 0, formulas = 0, questions = 0, tasks = 0;
  for (const c of courses) {
    const d = await getCourse(c.id);
    for (const l of d.lessons) {
      formulas += l.formulas.length;
      if (!l.entry) continue;
      lessons++;
      const paths = [...(l.entry.body ?? '').matchAll(/^import\s+\w+\s+from\s+['"]@labs\/([\w/]+)['"]/gm)].map((m) => m[1]!);
      labs += paths.length;
      labs3d += paths.filter(isLab3D).length;
    }
    const body = d.exam?.body ?? '';
    questions += (body.match(/<ExamQuiz\b/g) ?? []).length;
    tasks += (body.match(/<Steps\b/g) ?? []).length;
  }
  return { courses: courses.length, lessons, labs, labs3d, formulas, questions, tasks };
}

/** Данные карточки курса в каталоге — только сериализуемые поля, их получает остров. */
export interface CourseCardData {
  id: string; title: string; source?: string; subject: string; semester?: string; example: boolean;
  lessons: number[]; labs: number; href?: string;
}

export async function listCourses(): Promise<CourseCardData[]> {
  const all = await getCollection('courses');
  const out = await Promise.all(all.map(async (c) => {
    const d = await getCourse(c.id);
    return {
      id: c.id, title: c.data.title, source: c.data.source, subject: c.data.subject, semester: c.data.semester,
      example: c.data.example, lessons: d.lessons.map((l) => l.n), labs: d.labs,
      href: c.data.example ? undefined : courseHref(c.id),
    };
  }));
  // Настоящие курсы — первыми, заглушки — после, внутри групп по названию.
  return out.sort((a, b) => Number(a.example) - Number(b.example) || a.title.localeCompare(b.title, 'ru'));
}
