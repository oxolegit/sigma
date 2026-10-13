import { plural } from '../lib/plural';
import { Badge } from './Badge';
import { Progress } from './Progress';

export interface CourseCardProps {
  title: string; source?: string; subject?: string; semester?: string;
  lessons: number; labs: number; done?: number; example?: boolean; href?: string;
}

/** Карточка курса в каталоге. Ссылка — только название, карточка целиком не кликабельна. */
export function CourseCard({ title, source, subject, semester, lessons = 0, labs = 0, done = 0, example, href }: CourseCardProps) {
  return (
    <article className="rz-course">
      <div className="rz-course-meta">
        {subject && <span className="rz-course-tag">{subject}</span>}
        {semester && <span className="rz-course-tag">{semester}</span>}
        {example && <Badge tone="example">пример</Badge>}
      </div>
      <h3 className="rz-course-title">{href ? <a href={href}>{title}</a> : title}</h3>
      {source && <p className="rz-course-source">{source}</p>}
      <dl className="rz-course-stats">
        <div><dt>{plural(lessons, 'урок', 'урока', 'уроков')}</dt><dd>{lessons}</dd></div>
        <div><dt>{plural(labs, 'лаборатория', 'лаборатории', 'лабораторий')}</dt><dd>{labs}</dd></div>
      </dl>
      <Progress value={done} total={lessons} label="Мой прогресс" compact />
    </article>
  );
}
