import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://sigma.mslv.space',
  output: 'static',
  integrations: [react(), mdx()],
  vite: {
    // three.js (~550 КБ) живёт в отдельном чанке 3D-лаборатории и грузится, только когда она видна.
    build: { chunkSizeWarningLimit: 600 },
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
