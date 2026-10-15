import { useEffect, useState } from 'react';
import { cx } from '../../lib/cx';
import { isDone, lastVisit } from '../../lib/progress';
import { useProgress } from './useProgress';

export interface OutlineChapter {
  label: string;
  name: string;
  lessons: { n: number; title: string; meta: string; href?: string; labs?: number }[];
}
type Lesson = OutlineChapter['lessons'][number];
type Filter = 'all' | 'todo' | 'labs';

/** Оглавление на странице курса: фильтр чипами, модули карточками, уроки с отметками ✓, текущий урок, «готовится» у ненаписанных. */
export default function CourseOutline({ course, chapters }: { course: string; chapters: OutlineChapter[] }) {
  const map = useProgress();
  const [current, setCurrent] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  useEffect(() => setCurrent(lastVisit(course)?.n ?? null), [course]);

  const all = chapters.flatMap((ch) => ch.lessons);
  const todo = (l: Lesson) => !!l.href && !isDone(map, course, l.n);
  const withLabs = (l: Lesson) => (l.labs ?? 0) > 0;
  const keep = (l: Lesson) => filter === 'all' || (filter === 'todo' ? todo(l) : withLabs(l));
  const options: { value: Filter; label: string; n: number }[] = [
    { value: 'all', label: 'Все уроки', n: all.length },
    { value: 'todo', label: 'Не пройдены', n: all.filter(todo).length },
    { value: 'labs', label: 'С лабораториями', n: all.filter(withLabs).length },
  ];
  const shown = chapters.filter((ch) => ch.lessons.some(keep));

  return (
    <div className="sg-outline">
      <div className="sg-chips" role="group" aria-label="Показать уроки">
        {options.map((o) => (
          <button key={o.value} type="button" className="sg-chip" aria-pressed={filter === o.value} onClick={() => setFilter(o.value)}>
            {o.label}<span className="sg-chip-n">{o.n}</span>
          </button>
        ))}
      </div>
      {shown.map((ch) => (
        <section key={ch.name} className="sg-outline-chapter">
          <div className="sg-outline-head">
            {ch.label && <div className="sg-eyebrow sg-eyebrow-accent">{ch.label}</div>}
            <h2>{ch.name}</h2>
          </div>
          <ol className="sg-outline-list">
            {ch.lessons.filter(keep).map((l) => {
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
      {shown.length === 0 && <p className="sg-empty">Все уроки пройдены — можно повторить по шпаргалке или решить контрольную.</p>}
    </div>
  );
}
