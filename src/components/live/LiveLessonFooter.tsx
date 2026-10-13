import { isDone, setDone } from '../../lib/progress';
import { LessonFooter, type LessonFooterProps } from '../LessonFooter';
import { useProgress } from './useProgress';

/** Низ урока: отметка «Урок пройден» пишется в браузер. */
export default function LiveLessonFooter({ course, n, next }: { course: string; n: number; next?: LessonFooterProps['next'] }) {
  const map = useProgress();
  const done = isDone(map, course, n);
  return <LessonFooter done={done} onToggle={() => setDone(course, n, !done)} next={next} />;
}
