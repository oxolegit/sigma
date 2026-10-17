import { useEffect, useState } from 'react';
import type { PrepStep } from '../../lib/courses';
import { plural } from '../../lib/plural';
import { Progress } from '../Progress';
import { Rich } from '../Rich';

interface Props {
  /** Ключ localStorage: sigma:<курс>:prep<номер>. */
  storageKey: string;
  days: { title: string; minutes: number; steps: PrepStep[] }[];
}

const read = (key: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const write = (key: string, ids: string[]) => {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
};
const hours = (min: number) => (min < 60 ? `${min} мин` : `≈ ${Number((min / 60).toFixed(1)).toString().replace('.', ',')} ч`);

/** План подготовки по дням: шаги отмечаются галочкой, отметки живут в браузере. */
export default function PrepPlan({ storageKey, days }: Props) {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => { setDone(read(storageKey)); }, [storageKey]);

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    write(storageKey, next);
  };
  const total = days.reduce((s, d) => s + d.steps.length, 0);
  const count = days.reduce((s, d, i) => s + d.steps.filter((_, j) => done.includes(`${i}.${j}`)).length, 0);

  return (
    <div className="sg-prep-plan">
      <div className="sg-prep-progress">
        <Progress value={count} total={total} label={`Шаги плана: ${total} ${plural(total, 'шаг', 'шага', 'шагов')}`} />
      </div>
      <ol className="sg-prep-days">
        {days.map((d, i) => {
          const dayDone = d.steps.every((_, j) => done.includes(`${i}.${j}`));
          return (
            <li key={i} className={dayDone ? 'sg-prep-day is-done' : 'sg-prep-day'}>
              <div className="sg-prep-day-head">
                <span className="sg-prep-day-n">День {i + 1}{dayDone ? ' · готово ✓' : ''}</span>
                <h3>{d.title}</h3>
                <span className="sg-prep-day-time">{hours(d.minutes)}</span>
              </div>
              <ul className="sg-prep-steps">
                {d.steps.map((st, j) => {
                  const id = `${i}.${j}`, on = done.includes(id);
                  return (
                    <li key={j}>
                      <label className={on ? 'sg-prep-step is-done' : 'sg-prep-step'}>
                        <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                        <span className="sg-prep-step-text"><Rich>{st.text}</Rich></span>
                      </label>
                      {st.href && <a className="sg-prep-step-link" href={st.href}>открыть →</a>}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
