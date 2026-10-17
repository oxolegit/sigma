/**
 * Реестр вариантов: курс → его работы. SrVariant и счётчики курса берут задачи отсюда.
 */
import { buildVariant, type Works } from '../lib/variants';
import { WORKS as stats } from './stats/variants';
import { WORKS as nuclear } from './nuclear/variants';
import { WORKS as tpn } from './tpn/variants';

const COURSES: Record<string, Works> = { stats, nuclear, tpn };

const slots = (course: string, work: number) => COURSES[course]?.[work];

/** Сколько задач в варианте работы. */
export const variantSize = (course: string, work: number) => slots(course, work)?.length ?? 0;
/** Темы варианта — для подписи. */
export const variantTopics = (course: string, work: number) => (slots(course, work) ?? []).map((s) => s.topic);

export function makeVariant(course: string, work: number, variant: number) {
  const s = slots(course, work);
  if (!s) throw new Error(`Нет работы ${work} в курсе ${course}`);
  return buildVariant(s, work, variant);
}

/** Все генераторы каждой темы — для тестов. */
export const generators = (course: string, work: number) => (slots(course, work) ?? []).map((s) => s.gens);
