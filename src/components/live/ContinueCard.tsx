import { useEffect, useState } from 'react';
import { countDone, lastVisit, type LastVisit } from '../../lib/progress';
import { Progress } from '../Progress';
import { useProgress } from './useProgress';

/** Карточка «Продолжить» на главной: последний открытый урок и прогресс по его курсу.
 *  Пока ничего не открыто, ведёт к первому написанному уроку. */
export default function ContinueCard({ lessonsByCourse, fallback }: { lessonsByCourse: Record<string, number[]>; fallback: LastVisit }) {
  const map = useProgress();
  const [visit, setVisit] = useState<LastVisit | null>(null);
  useEffect(() => setVisit(lastVisit()), []);

  const v = visit && lessonsByCourse[visit.course] ? visit : fallback;
  const lessons = lessonsByCourse[v.course] ?? [];
  const done = countDone(map, v.course, lessons);
  return (
    <a className="sg-continue" href={v.href}>
      <span className="sg-eyebrow sg-eyebrow-accent">{visit ? 'Продолжить' : 'Начать'}</span>
      <span className="sg-continue-title">Урок {v.n}. {v.title}</span>
      <span className="sg-continue-meta">{v.courseTitle} · пройдено {done} из {lessons.length}</span>
      <Progress value={done} total={lessons.length} label="Прогресс по курсу" compact />
    </a>
  );
}
