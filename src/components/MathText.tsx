import katex from 'katex';
import { useMemo } from 'react';

/**
 * Текст задачи с формулами в \( … \) и \[ … \] (как в генераторах тренажёра).
 * Строки пишет код генераторов, не пользователь, поэтому HTML-разметка вроде <p> допустима.
 */
export function mathHtml(src: string): string {
  return src.replace(/\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g, (_, block: string | undefined, inline: string | undefined) => {
    try {
      return katex.renderToString((block ?? inline)!, { displayMode: block !== undefined, throwOnError: true });
    } catch {
      return `<span class="rz-tex-raw">${(block ?? inline)!.replace(/</g, '&lt;')}</span>`;
    }
  });
}

export function MathText({ children, as: Tag = 'div', className }: { children: string; as?: 'div' | 'span'; className?: string }) {
  const html = useMemo(() => mathHtml(children), [children]);
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
