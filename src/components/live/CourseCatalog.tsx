import { useMemo, useState } from 'react';
import type { CourseCardData } from '../../lib/courses';
import { plural } from '../../lib/plural';
import { countDone } from '../../lib/progress';
import { CourseCard } from '../CourseCard';
import { Segmented } from '../Segmented';
import { useProgress } from './useProgress';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

/** Каталог: поиск, фильтр по семестру и предмету, карточки с прогрессом из браузера. */
export default function CourseCatalog({ courses }: { courses: CourseCardData[] }) {
  const map = useProgress();
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('all');
  const [subject, setSubject] = useState('all');

  const semesters = useMemo(() => [...new Set(courses.map((c) => c.semester).filter(Boolean) as string[])].sort(), [courses]);
  const subjects = useMemo(() => [...new Set(courses.map((c) => c.subject))].sort((a, b) => a.localeCompare(b, 'ru')), [courses]);

  const q = norm(query.trim());
  const list = courses.filter((c) =>
    (semester === 'all' || c.semester === semester)
    && (subject === 'all' || c.subject === subject)
    && (!q || norm(`${c.title} ${c.subject} ${c.source ?? ''}`).includes(q)));

  return (
    <>
      <section className="sg-filters" aria-label="Фильтры">
        <label className="sg-field-wrap sg-field-grow">
          Поиск по курсам
          <input className="sg-field" type="search" placeholder="Название, предмет или учебник" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <Segmented
          label="Семестр" value={semester} onChange={setSemester}
          options={[{ value: 'all', label: 'Все' }, ...semesters.map((s) => ({ value: s, label: s }))]}
        />
        <label className="sg-field-wrap">
          Предмет
          <select className="sg-field" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="all">Все предметы</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </section>

      <div className="sg-section-head">
        <h2 id="courses">Курсы</h2>
        <span className="sg-count" aria-live="polite">{list.length} {plural(list.length, 'курс', 'курса', 'курсов')}</span>
      </div>
      <div className="sg-grid">
        {list.map((c) => (
          <CourseCard
            key={c.id} title={c.title} source={c.source} subject={c.subject} semester={c.semester}
            lessons={c.lessons.length} labs={c.labs} done={countDone(map, c.id, c.lessons)} example={c.example} href={c.href}
          />
        ))}
      </div>
      {list.length === 0 && <p className="sg-empty">Ничего не нашлось. Попробуйте другой предмет или семестр.</p>}
    </>
  );
}
