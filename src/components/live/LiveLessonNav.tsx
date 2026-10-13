import { isDone } from '../../lib/progress';
import { LessonNav, type LessonNavProps } from '../LessonNav';
import { useProgress } from './useProgress';

/** Оглавление курса с галочками пройденных уроков. */
export default function LiveLessonNav({ course, chapters, layout }: LessonNavProps & { course: string }) {
  const map = useProgress();
  return (
    <LessonNav
      layout={layout}
      chapters={chapters.map((ch) => ({ ...ch, lessons: ch.lessons.map((l) => ({ ...l, done: isDone(map, course, l.n) })) }))}
    />
  );
}
