import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { NavLesson } from '../components';
import { variantSize } from '../labs/variants';

type Formula = { title: string; tex: string; note?: string };
export type Source = { id: string; cite: string; url?: string; note?: string };
/** Ссылка урока на литературу, уже с описанием источника. */
export type Reference = { source: Source; where: string };

export interface OutlineLesson {
  n: number; title: string; ref?: string; chapter: string; href?: string;
  /** «Глава 2», «Модуль 1» — для метки над заголовком урока. */
  chapterNo?: string;
  refs: Reference[];
  entry?: CollectionEntry<'lessons'>;
  formulas: Formula[];
}
export interface CourseData {
  id: string;
  course: CollectionEntry<'courses'>;
  lessons: OutlineLesson[];
  chapters: { title: string; label: string; name: string; lessons: NavLesson[] }[];
  exam?: CollectionEntry<'exams'>;
  /** Самостоятельные работы по порядку номеров. */
  works: Work[];
  /** Подготовка к самостоятельным — по номеру работы. */
  preps: Prep[];
  labs: number;
}
export interface Work { n: number; href: string; entry: CollectionEntry<'exams'> }
export interface PrepStep { text: string; href?: string }
export interface Prep {
  n: number; href: string; title: string; lead: string; work?: Work;
  days: { title: string; minutes: number; steps: PrepStep[] }[];
  memorize: { title: string; items: Formula[] }[];
  minutes: number; formulas: number;
}

export const lessonSlug = (entry: CollectionEntry<'lessons'>) => entry.id.split('/')[1]!;
export const lessonHref = (course: string, entry: CollectionEntry<'lessons'>) => `/${course}/${lessonSlug(entry)}/`;
export const courseHref = (course: string) => `/${course}/`;
export const examHref = (course: string) => `/${course}/exam/`;
export const sheetHref = (course: string) => `/${course}/sheet/`;
export const workHref = (course: string, n: number) => `/${course}/sr/${n}/`;
export const prepHref = (course: string, n: number) => `/${course}/prep/${n}/`;

/** Исходники компонентов из src/labs: по ним видно, что лаборатория (LabFrame), а что трёхмерная (kind="3D"). */
const LAB_SOURCES = import.meta.glob('../labs/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const labSource = (path: string) => Object.entries(LAB_SOURCES).find(([p]) => p.endsWith(`/labs/${path}.tsx`))?.[1] ?? '';
/** Лаборатория — компонент в рамке LabFrame; тренажёр и прочие компоненты из @labs ими не считаются. */
const isLab = (path: string) => labSource(path).includes('<LabFrame');
const isLab3D = (path: string) => isLab(path) && /kind="3D"/.test(labSource(path));

/** Номер и название лабораторий урока — из их исходников (n="1.1", title="…" у LabFrame), для поиска. */
export function lessonLabs(entry: { body?: string }): { n: string; title: string; id: string }[] {
  const body = entry.body ?? '';
  return [...body.matchAll(/^import\s+\w+\s+from\s+['"]@labs\/([\w/]+)['"]/gm)]
    .map((m) => labSource(m[1]!))
    .filter((src) => src.includes('<LabFrame'))
    .map((src) => {
      const n = /\bn="([\d.]+)"/.exec(src)?.[1] ?? '';
      // Свой якорь (id="lab-…" у LabFrame) — у лабораторий, на которые ссылаются извне.
      return { n, title: /\btitle="([^"]+)"/.exec(src)?.[1] ?? '', id: /\bid="(lab-[\w-]+)"/.exec(src)?.[1] ?? `lab-${n}` };
    })
    .filter((l) => l.n && l.title);
}

/** Лаборатории (пути из @labs), тренажёры и вопросы урока — по исходнику MDX. */
export function lessonStats(entry: { body?: string }) {
  const body = entry.body ?? '';
  const labPaths = [...body.matchAll(/^import\s+\w+\s+from\s+['"]@labs\/([\w/]+)['"]/gm)].map((m) => m[1]!).filter(isLab);
  return {
    labs: labPaths.length,
    labs3d: labPaths.filter(isLab3D).length,
    trainers: (body.match(/<Trainer\b/g) ?? []).length,
    questions: (body.match(/<(?:Exam)?Quiz\b/g) ?? []).length,
    /** Задачи с проверкой ответа (в самостоятельных): отдельные и задачи одного варианта SrVariant. */
    tasks: (body.match(/<SrTask\b/g) ?? []).length
      + [...body.matchAll(/<SrVariant\b[^>]*>/g)].reduce((s, [tag]) => s + variantSize(/course="(\w+)"/.exec(tag)?.[1] ?? '', Number(/work=\{(\d+)\}/.exec(tag)?.[1])), 0),
    /** Есть ли вариант со своим счётом. */
    variant: /<SrVariant\b/.test(body),
    /** Задачи с пошаговым решением. */
    solved: (body.match(/<Steps\b/g) ?? []).length,
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
  const allExams = await getCollection('exams');
  const exam = allExams.find((e) => e.id === id);
  const works = allExams
    .filter((e) => e.id.startsWith(`${id}/`))
    .map((entry) => {
      if (!entry.data.n) throw new Error(`Самостоятельная ${entry.id}: не задан номер n`);
      return { n: entry.data.n, href: workHref(id, entry.data.n), entry };
    })
    .sort((a, b) => a.n - b.n);

  const lessons: OutlineLesson[] = [];
  const chapters = course.data.chapters.map((ch) => {
    // У глав без номера («Дополнения») метки нет — иначе название повторится дважды.
    const label = ch.n ? `${course.data.chapterLabel} ${ch.n}` : '';
    const title = ch.n ? `${label} · ${ch.title}` : ch.title;
    return {
      title, label, name: ch.title,
      lessons: ch.lessons.map((l) => {
        const entry = written.find((w) => w.data.n === l.n);
        if (entry && l.formulas.length && entry.data.formulas.length) {
          throw new Error(`Урок ${entry.id}: формулы заданы и в уроке, и в оглавлении курса — оставьте их в уроке`);
        }
        const href = entry ? lessonHref(id, entry) : undefined;
        const refs = (entry?.data.refs ?? []).map((r) => {
          const source = course.data.literature.find((x) => x.id === r.source);
          if (!source) throw new Error(`Урок ${entry!.id}: источника «${r.source}» нет в literature курса «${id}»`);
          return { source, where: r.where };
        });
        lessons.push({ n: l.n, title: l.title, ref: l.ref, chapter: title, chapterNo: label || undefined, href, entry, refs, formulas: entry?.data.formulas.length ? entry.data.formulas : l.formulas });
        return { n: l.n, title: l.title, ref: l.ref, href };
      }),
    };
  });

  for (const w of written) {
    if (!lessons.some((l) => l.n === w.data.n)) {
      throw new Error(`Урок ${w.id}: номера ${w.data.n} нет в оглавлении курса «${id}»`);
    }
  }
  // Подготовка: шаги плана ссылаются на уроки по номеру — ненаписанный урок или чужой номер роняют сборку.
  const preps: Prep[] = (await getCollection('preps'))
    .filter((p) => p.id.startsWith(`${id}/`))
    .map((p) => {
      const work = works.find((w) => w.n === p.data.work);
      const days = p.data.days.map((d) => ({
        title: d.title, minutes: d.minutes,
        steps: d.steps.map((st) => {
          if (st.lesson) {
            const l = lessons.find((x) => x.n === st.lesson);
            if (!l?.href) throw new Error(`Подготовка ${p.id}: урок ${st.lesson} не написан или его нет в оглавлении`);
            return { text: st.text, href: l.href };
          }
          if (st.to === 'sr') {
            if (!work) throw new Error(`Подготовка ${p.id}: нет самостоятельной ${p.data.work}`);
            return { text: st.text, href: work.href };
          }
          return { text: st.text, href: st.to === 'sheet' ? sheetHref(id) : undefined };
        }),
      }));
      return {
        n: p.data.work, href: prepHref(id, p.data.work), title: p.data.title, lead: p.data.lead, work, days, memorize: p.data.memorize,
        minutes: days.reduce((s, d) => s + d.minutes, 0),
        formulas: p.data.memorize.reduce((s, g) => s + g.items.length, 0),
      };
    })
    .sort((a, b) => a.n - b.n);

  const labs = course.data.example
    ? course.data.labs ?? 0
    : written.reduce((sum, w) => sum + lessonStats(w).labs, 0);
  return { id, course, lessons, chapters, exam, works, preps, labs };
}

/** Цифры для главной — считаются по контенту, а не пишутся руками. */
export async function siteStats() {
  const courses = (await getCollection('courses')).filter((c) => !c.data.example);
  let lessons = 0, labs = 0, labs3d = 0, trainers = 0, formulas = 0, questions = 0, tasks = 0;
  for (const c of courses) {
    const d = await getCourse(c.id);
    for (const l of d.lessons) {
      formulas += l.formulas.length;
      if (!l.entry) continue;
      lessons++;
      const s = lessonStats(l.entry);
      labs += s.labs;
      labs3d += s.labs3d;
      trainers += s.trainers;
    }
    // Контрольная и самостоятельные: вопросы с вариантами, задачи с решением и с проверкой ответа.
    for (const e of [d.exam, ...d.works.map((w) => w.entry)]) {
      if (!e) continue;
      const s = lessonStats(e);
      questions += s.questions;
      tasks += s.solved + s.tasks;
    }
  }
  return { courses: courses.length, lessons, labs, labs3d, trainers, formulas, questions, tasks };
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
