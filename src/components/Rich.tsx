import type { ReactNode } from 'react';
import { TeX } from './TeX';

/** Текст со строчными формулами: в строке `$…$` превращается в <TeX>.
 *  Нужен потому, что в острова Astro из MDX нельзя передать JSX — только строки.
 *  Всё, что не строка, отдаётся как есть. */
export function Rich({ children }: { children?: ReactNode }) {
  if (typeof children !== 'string') return <>{children}</>;
  const parts = children.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith('$') && part.endsWith('$')
          ? <TeX key={i} tex={part.slice(1, -1)} />
          : part,
      )}
    </>
  );
}
