import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const formula = z.object({ title: z.string(), tex: z.string(), note: z.string().optional() });

/**
 * Курс — YAML с оглавлением. Оглавление — единственный источник названий уроков
 * и параграфов: в нём перечислены и уже написанные, и запланированные уроки.
 */
const courses = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    source: z.string().optional(),
    description: z.string().optional(),
    subject: z.string(),
    semester: z.string().optional(),
    /** Курс-заглушка для каталога: метка «пример», без страниц. */
    example: z.boolean().default(false),
    /** Плановое число лабораторий — только для заглушек; у настоящего курса считается по урокам. */
    labs: z.number().int().nonnegative().optional(),
    chapters: z.array(z.object({
      /** Номер главы; у «Дополнений» его нет. */
      n: z.number().optional(),
      title: z.string(),
      lessons: z.array(z.object({
        n: z.number().int().positive(),
        title: z.string(),
        ref: z.string().optional(),
        /** Формулы для шпаргалки, пока урок не написан. Когда урок появится, они переезжают в его frontmatter. */
        formulas: z.array(formula).default([]),
      })),
    })),
  }),
});

/**
 * Урок — MDX в папке курса: src/content/lessons/<курс>/<номер>-<slug>.mdx.
 * Название и параграф берутся из оглавления курса по номеру n.
 */
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    n: z.number().int().positive(),
    minutes: z.number().optional(),
    lead: z.string().optional(),
    ask: z.array(z.string()).default([]),
    formulas: z.array(formula).default([]),
  }),
});

/** Пробная контрольная курса — MDX: src/content/exams/<курс>.mdx. */
const exams = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/exams' }),
  schema: z.object({
    title: z.string(),
    scope: z.string().optional(),
    lead: z.string().optional(),
  }),
});

export const collections = { courses, lessons, exams };
