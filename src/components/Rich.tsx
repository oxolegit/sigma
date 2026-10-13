import type { ReactNode } from 'react';
import { TeX } from './TeX';

/** Жирный `**…**` внутри обычного текста. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}</>;
}

/** Текст со строчными формулами и выделением: `$…$` превращается в <TeX>, `**…**` — в жирный.
 *  Нужен потому, что в острова Astro из MDX нельзя передать JSX — только строки.
 *  Всё, что не строка, отдаётся как есть. */
export function Rich({ children }: { children?: ReactNode }) {
  if (typeof children !== 'string') return <>{children}</>;
  // Сначала формулы: внутри них звёздочки — часть TeX, а не разметка.
  const parts = children.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith('$') && part.endsWith('$')
          ? <TeX key={i} tex={part.slice(1, -1)} />
          : <Bold key={i} text={part} />,
      )}
    </>
  );
}
