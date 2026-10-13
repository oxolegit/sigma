import { useEffect, useRef } from 'react';
import { cx } from '../lib/cx';

export interface NavLesson { n: number; title: string; ref?: string; href?: string; done?: boolean; current?: boolean }
export interface LessonNavProps { chapters: { title?: string; lessons: NavLesson[] }[]; layout?: 'side' | 'strip' }

/** Оглавление курса: колонка слева (`side`) или лента под шапкой на телефоне (`strip`).
 *  В ленте текущий урок прокручивается в видимую область. */
export function LessonNav({ chapters, layout = 'side' }: LessonNavProps) {
  const strip = layout === 'strip';
  const nav = useRef<HTMLElement>(null);
  const current = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // Двигаем только ленту по горизонтали. scrollIntoView прокрутил бы и окно: лента гидрируется
    // с client:idle, и страница, которую уже начали читать, прыгала бы обратно к шапке.
    const s = nav.current, a = current.current;
    if (!strip || !s || !a) return;
    const left = a.getBoundingClientRect().left - s.getBoundingClientRect().left + s.scrollLeft;
    s.scrollLeft = left - (s.clientWidth - a.offsetWidth) / 2;
  }, [strip]);
  return (
    <nav ref={nav} className={cx('rz-nav', strip ? 'rz-nav-strip' : 'rz-nav-side')} aria-label="Уроки курса">
      {chapters.map((ch, i) => (
        <div key={i} className="rz-nav-chapter">
          {!strip && ch.title && <div className="rz-nav-chapter-title">{ch.title}</div>}
          <ol className="rz-nav-list">
            {ch.lessons.map((l) => {
              const inner = <>
                <span className="rz-nav-n" aria-label={l.done ? 'пройден' : undefined}>{l.done ? '✓' : l.n}</span>
                <span className="rz-nav-t">{l.title}</span>
                {!strip && l.ref && <span className="rz-nav-ref">{l.ref}</span>}
              </>;
              return (
                <li key={l.n}>
                  {l.href || l.current ? (
                    <a
                      ref={l.current ? current : undefined}
                      href={l.href ?? '#'}
                      className={cx('rz-nav-item', l.current && 'is-current', l.done && 'is-done')}
                      aria-current={l.current ? 'page' : undefined}
                    >{inner}</a>
                  ) : (
                    // Урок ещё не написан: виден в оглавлении, но не ссылка.
                    <span className="rz-nav-item is-soon" title="Урок готовится">{inner}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}
