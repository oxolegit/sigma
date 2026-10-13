import { countDone } from '../../lib/progress';
import { Progress } from '../Progress';
import { useProgress } from './useProgress';

/** Прогресс по курсу из браузера. */
export default function LiveCourseProgress({ course, lessons, label, compact }: { course: string; lessons: number[]; label?: string; compact?: boolean }) {
  const map = useProgress();
  return <Progress value={countDone(map, course, lessons)} total={lessons.length} label={label} compact={compact} />;
}
