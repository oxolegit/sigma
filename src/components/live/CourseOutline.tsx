import { useEffect, useState } from 'react';
import { cx } from '../../lib/cx';
import { isDone, lastVisit } from '../../lib/progress';
import { useProgress } from './useProgress';

export interface OutlineChapter {
  label: string;
  name: string;
  lessons: { n: number; title: string; meta: string; href?: string }[];
}

/** Оглавление на странице курса: главы, уроки с отметками ✓, текущий урок, «готовится» у ненаписанных. */
export default function CourseOutline({ course, chapters }: { course: string; chapters: OutlineChapter[] }) {
  const map = useProgress();
  const [current, setCurrent] = useState<number | null>(null);
  useEffect(() => setCurrent(lastVisit(course)?.n ?? null), [course]);

  return (
    <div className="sg-outline">
      {chapters.map((ch) => (
        <section key={ch.name} className="sg-outline-chapter">
          <div className="sg-outline-head">
            {ch.label && <div className="sg-eyebrow">{ch.label}</div>}
            <h2>{ch.name}</h2>
          </div>
          <ol className="sg-outline-list">
            {ch.lessons.map((l) => {
              const done = isDone(map, course, l.n);
              const cur = l.n === current && !!l.href;
              const status = done ? 'Пройден' : cur ? 'Продолжить →' : l.href ? '' : 'готовится';
              const body = <>
                <span className={cx('sg-outline-mark', done && 'is-done', cur && 'is-current')} aria-label={done ? 'пройден' : undefined}>{done ? '✓' : l.n}</span>
                <span className="sg-outline-text">
                  <span className="sg-outline-title">Урок {l.n}. {l.title}</span>
                  <span className="sg-outline-meta">{l.meta}</span>
                </span>
                <span className={cx('sg-outline-status', done && 'is-done')}>{status}</span>
              </>;
              return (
                <li key={l.n}>
                  {l.href
                    ? <a className={cx('sg-outline-row', cur && 'is-current')} href={l.href} aria-current={cur ? 'step' : undefined}>{body}</a>
                    : <span className="sg-outline-row is-soon">{body}</span>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
