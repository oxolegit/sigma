import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Курс — YAML с оглавлением. Оглавление — единственный источник названий уроков
 * и параграфов: в нём перечислены и уже написанные, и запланированные уроки.
 */
const courses = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    source: z.string().optional(),
    subject: z.string(),
    semester: z.string().optional(),
    example: z.boolean().default(false),
    chapters: z.array(z.object({
      /** Номер главы; у «Дополнений» его нет. */
      n: z.number().optional(),
      title: z.string(),
      lessons: z.array(z.object({
        n: z.number().int().positive(),
        title: z.string(),
        ref: z.string().optional(),
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
    formulas: z.array(z.object({ title: z.string(), tex: z.string(), note: z.string().optional() })).default([]),
  }),
});

export const collections = { courses, lessons };
