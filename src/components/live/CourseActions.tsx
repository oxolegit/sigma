import { useEffect, useState } from 'react';
import { isDone, lastVisit, progressLink } from '../../lib/progress';
import { Button } from '../Button';
import { useProgress } from './useProgress';

interface Written { n: number; href: string }
interface WorkLink { n: number; href: string }

/** Кнопки страницы курса: «Продолжить с урока N», контрольная, самостоятельные, шпаргалка и ссылка для переноса прогресса. */
export default function CourseActions({ course, written, examHref, works = [], sheetHref }: { course: string; written: Written[]; examHref?: string; works?: WorkLink[]; sheetHref: string }) {
  const map = useProgress();
  const [last, setLast] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => setLast(lastVisit(course)?.n ?? null), [course]);

  // Последний открытый урок, иначе первый непройденный из написанных, иначе первый написанный.
  const target = written.find((l) => l.n === last) ?? written.find((l) => !isDone(map, course, l.n)) ?? written[0];
  const started = last !== null || written.some((l) => isDone(map, course, l.n));

  const share = async () => {
    if (!Object.keys(map).length) { setMessage('Пока нечего переносить: отметьте хотя бы один урок пройденным.'); return; }
    const link = progressLink(location.origin, map);
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Ссылка скопирована. Откройте её на другом устройстве — прогресс перенесётся.');
    } catch {
      setMessage(`Скопируйте ссылку вручную: ${link}`);
    }
  };

  return (
    <div className="sg-course-actions">
      <div className="sg-row">
        {target && <Button variant="primary" href={target.href}>{started ? 'Продолжить' : 'Начать'} с урока {target.n}</Button>}
        {examHref && <Button href={examHref}>Пробная контрольная</Button>}
        {works.map((w) => <Button key={w.n} href={w.href}>Самостоятельная {w.n}</Button>)}
        <Button href={sheetHref}>Шпаргалка формул</Button>
      </div>
      <div className="sg-row">
        <Button variant="ghost" size="sm" onClick={share}>Ссылка на мой прогресс</Button>
        <span className="sg-share-status" role="status">{message}</span>
      </div>
    </div>
  );
}
