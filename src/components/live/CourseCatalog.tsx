import { useMemo, useState } from 'react';
import type { CourseCardData } from '../../lib/courses';
import { plural } from '../../lib/plural';
import { countDone } from '../../lib/progress';
import { CourseCard } from '../CourseCard';
import { Segmented } from '../Segmented';
import { useProgress } from './useProgress';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
type Sort = 'title' | 'progress' | 'size';

/** Чипы одного фильтра: «Все» и значения со счётчиком курсов. */
function Chips({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; n: number }[] }) {
  return (
    <div className="sg-chips" role="group" aria-label={label}>
      <span className="sg-chips-label">{label}</span>
      {[{ value: 'all', n: options.reduce((s, o) => s + o.n, 0) }, ...options].map((o) => (
        <button key={o.value} type="button" className="sg-chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.value === 'all' ? 'Все' : o.value}<span className="sg-chip-n">{o.n}</span>
        </button>
      ))}
    </div>
  );
}

/** Каталог: поиск, фильтры чипами по предмету и семестру, сортировка, карточки с прогрессом из браузера. */
export default function CourseCatalog({ courses }: { courses: CourseCardData[] }) {
  const map = useProgress();
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('all');
  const [subject, setSubject] = useState('all');
  const [sort, setSort] = useState<Sort>('title');

  const count = (key: 'subject' | 'semester') => {
    const m = new Map<string, number>();
    for (const c of courses) { const v = c[key]; if (v) m.set(v, (m.get(v) ?? 0) + 1); }
    return [...m].sort((a, b) => a[0].localeCompare(b[0], 'ru')).map(([value, n]) => ({ value, n }));
  };
  const subjects = useMemo(() => count('subject'), [courses]);
  const semesters = useMemo(() => count('semester'), [courses]);

  const q = norm(query.trim());
  const progress = (c: CourseCardData) => (c.lessons.length ? countDone(map, c.id, c.lessons) / c.lessons.length : 0);
  const list = courses
    .filter((c) =>
      (semester === 'all' || c.semester === semester)
      && (subject === 'all' || c.subject === subject)
      && (!q || norm(`${c.title} ${c.subject} ${c.source ?? ''}`).includes(q)))
    .sort((a, b) => Number(a.example) - Number(b.example)
      || (sort === 'progress' ? progress(b) - progress(a) : sort === 'size' ? b.lessons.length - a.lessons.length : 0)
      || a.title.localeCompare(b.title, 'ru'));
  const filtered = q || semester !== 'all' || subject !== 'all';

  return (
    <>
      <div className="sg-section-head">
        <h2 id="courses">Курсы</h2>
        <span className="sg-count" aria-live="polite">{filtered ? `найдено ${list.length} из ${courses.length}` : `${list.length} ${plural(list.length, 'курс', 'курса', 'курсов')}`}</span>
      </div>
      <section className="sg-filters" aria-label="Поиск и фильтры">
        <label className="sg-search-inline">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <span className="sg-visually-hidden">Поиск по курсам</span>
          <input className="sg-field" type="search" placeholder="Название, предмет или учебник" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="sg-filters-row">
          {subjects.length > 1 && <Chips label="Предмет" value={subject} onChange={setSubject} options={subjects} />}
          {semesters.length > 1 && <Chips label="Семестр" value={semester} onChange={setSemester} options={semesters} />}
          <Segmented
            label="Сортировка" value={sort} onChange={(v) => setSort(v as Sort)}
            options={[{ value: 'title', label: 'По названию' }, { value: 'progress', label: 'По прогрессу' }, { value: 'size', label: 'По размеру' }]}
          />
        </div>
      </section>
      <div className="sg-grid">
        {list.map((c) => (
          <CourseCard
            key={c.id} title={c.title} source={c.source} subject={c.subject} semester={c.semester}
            lessons={c.lessons.length} labs={c.labs} done={countDone(map, c.id, c.lessons)} example={c.example} href={c.href}
          />
        ))}
      </div>
      {list.length === 0 && (
        <p className="sg-empty">
          Ничего не нашлось.{' '}
          <button type="button" className="rz-btn rz-btn-ghost rz-btn-sm" onClick={() => { setQuery(''); setSubject('all'); setSemester('all'); }}>Сбросить фильтры</button>
        </p>
      )}
    </>
  );
}
