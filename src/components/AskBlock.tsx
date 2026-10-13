import type { ReactNode } from 'react';
import { Rich } from './Rich';

export interface AskBlockProps { items: ReactNode[]; title?: string }

/** «Что спросят»: что надо уметь вывести или объяснить. Пункты могут содержать `$…$`. */
export function AskBlock({ items, title = 'Что спросят' }: AskBlockProps) {
  return (
    <aside className="rz-ask">
      <div className="rz-ask-title">{title}</div>
      <ul>{items.map((it, i) => <li key={i}><Rich>{it}</Rich></li>)}</ul>
    </aside>
  );
}
