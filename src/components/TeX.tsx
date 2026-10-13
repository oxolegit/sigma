import katex from 'katex';
import { useMemo } from 'react';
import { cx } from '../lib/cx';

export interface TeXProps { tex: string; block?: boolean }

/** Формула TeX. Рендерится KaTeX в строку — работает и на сервере, и в острове.
 *  Если TeX не разобрался, показывает исходник приглушённым цветом. */
export function TeX({ tex, block }: TeXProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: !!block, throwOnError: true });
    } catch {
      return null;
    }
  }, [tex, block]);
  const Tag = block ? 'div' : 'span';
  if (html === null) return <Tag className={cx('rz-tex', block && 'rz-tex-block', 'rz-tex-raw')}>{tex}</Tag>;
  return <Tag className={cx('rz-tex', block && 'rz-tex-block')} dangerouslySetInnerHTML={{ __html: html }} />;
}
