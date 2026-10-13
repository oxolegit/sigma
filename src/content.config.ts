import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const courses = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    source: z.string().optional(),
    subject: z.string(),
    semester: z.string().optional(),
    example: z.boolean().default(false),
    chapters: z.array(z.object({ n: z.number(), title: z.string() })),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    n: z.number(),
    title: z.string(),
    ref: z.string().optional(),
    chapter: z.number(),
    minutes: z.number().optional(),
    ask: z.array(z.string()).default([]),
    formulas: z.array(z.object({ title: z.string(), tex: z.string(), note: z.string().optional() })).default([]),
  }),
});

export const collections = { courses, lessons };
