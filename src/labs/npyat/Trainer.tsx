import { useEffect, useId, useState } from 'react';
import { Button, Rich, TeX } from '../../components';
import { checkAnswer, type AnswerVerdict } from '../../lib/answer';
import { mulberry32, type Rng } from '../../lib/rng';
import { chadwickTask, invMTask } from './tasks';

/** Допуск ответа — 5 %, как у измерений Чедвика. */
const TOL = 0.05;

interface Task { q: string; label: string; unit?: string; value: number; hint: string; ans: string; sol: string }

const texSci = (v: number) => {
  const e = Math.floor(Math.log10(Math.abs(v)));
  return `${Number((v / 10 ** e).toPrecision(3))}\\cdot10^{${e}}`;
};

const KINDS = {
  chadwick: (rng: Rng): Task => {
    const t = chadwickTask(rng);
    const r = t.u1 / t.u2;
    return {
      q: `Нейтроны из бериллия выбивают ядра водорода с наибольшей скоростью $u_H = ${texSci(t.u1)}$ см/с, а ядра ${t.name} ($M = ${t.M2}$) — с $u = ${texSci(t.u2)}$ см/с. Найдите массу нейтрона.`,
      label: 'Масса $m$', unit: 'а.е.м.', value: t.answer,
      hint: `Отношение скоростей $u_H/u = (m + ${t.M2})/(m + 1)$ не зависит от скорости нейтрона.`,
      ans: `m = \\frac{${t.M2} - r}{r - 1} = \\frac{${t.M2} - ${r.toFixed(3)}}{${r.toFixed(3)} - 1} = ${t.answer.toFixed(2)}\\ \\text{а.е.м.}`,
      sol: `Отношение $r = u_H/u = ${r.toFixed(3)}$. Из $r(m + 1) = m + ${t.M2}$ масса выражается линейно.`,
    };
  },
  invM: (rng: Rng): Task => {
    const t = invMTask(rng);
    const rows = t.positions.map((p, i) => `${p} % — ${t.counts[i]} имп/с`).join('; ');
    const n = t.positions.length;
    const [p1, p2] = [t.positions[n - 2]!, t.positions[n - 1]!];
    const [y1, y2] = [t.counts[0]! / t.counts[n - 2]!, t.counts[0]! / t.counts[n - 1]!];
    return {
      q: `Стержень выдвигают шагами и на каждом плато записывают скорость счёта: ${rows}. По двум последним точкам 1/M предскажите, при каком выдвижении реактор станет критическим.`,
      label: 'Критическое положение', unit: '%', value: t.answer,
      hint: '$1/M = N_0/N$, где $N_0$ — счёт при вставленном стержне. Проведите прямую через две последние точки до $1/M = 0$.',
      ans: `p_{\\text{кр}} = p_2 + \\frac{(1/M)_2\\,(p_2 - p_1)}{(1/M)_1 - (1/M)_2} = ${p2} + \\frac{${y2.toFixed(3)}\\cdot${p2 - p1}}{${y1.toFixed(3)} - ${y2.toFixed(3)}} = ${t.answer.toFixed(1)}\\ \\%`,
      sol: `Точки: $1/M_1 = ${t.counts[0]}/${t.counts[n - 2]} = ${y1.toFixed(3)}$ при ${p1} %, $1/M_2 = ${t.counts[0]}/${t.counts[n - 1]} = ${y2.toFixed(3)}$ при ${p2} %. Модель, из которой взяты числа, критична при ${t.critical} %: кривая 1/M слегка выгнута, поэтому прямая по последним точкам ошибается на проценты — и тем меньше, чем ближе точки к критике.`,
    };
  },
} as const;

const MESSAGE: Record<AnswerVerdict, string> = {
  ok: 'Верно.',
  close: 'Близко, но не в пределах 5 %: проверьте отношение.',
  wrong: 'Неверно.',
  unreadable: 'Не удалось прочитать число.',
};

interface Props { n?: string; title: string; kind: keyof typeof KINDS }

/**
 * Числовой тренажёр со случайными данными: задача создаётся после монтирования (на сервере случайных чисел нет),
 * ответ засчитывается с допуском 5 %. Оформление — как у тренажёра урока математики.
 */
export default function Trainer({ n, title, kind }: Props) {
  const id = useId();
  const [rng] = useState(() => mulberry32((Date.now() ^ (Math.random() * 2 ** 31)) | 0));
  const [task, setTask] = useState<Task | null>(null);
  const [input, setInput] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [shown, setShown] = useState<'none' | 'hint' | 'answer'>('none');
  const [solved, setSolved] = useState(0);
  const [counted, setCounted] = useState(false);

  const next = () => { setTask(KINDS[kind](rng)); setInput(''); setVerdict(null); setShown('none'); setCounted(false); };
  useEffect(() => { next(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const check = () => {
    if (!task || !input.trim()) return;
    const v = checkAnswer(input.replace('%', ''), task.value, TOL);
    setVerdict(v);
    if (v === 'ok' && !counted) { setSolved((x) => x + 1); setCounted(true); }
  };

  return (
    <section className="sg-trainer" aria-label={title}>
      <header className="sg-trainer-head">
        <span className="rz-lab-tag">{`Тренажёр${n ? ` ${n}` : ''}`}</span>
        <span className="sg-trainer-title">{title}</span>
        <span className="sg-trainer-score" aria-live="polite">решено {solved}</span>
      </header>
      <div className="sg-trainer-body">
        <p className="sg-trainer-q">{task ? <Rich>{task.q}</Rich> : 'Готовим задачу…'}</p>
        <form className="sg-trainer-form" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <label htmlFor={id} className="sg-trainer-label">{task ? <Rich>{task.label}</Rich> : 'Ответ'}{task?.unit ? `, ${task.unit}` : ''}</label>
          <input
            id={id} className="sg-field" type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
            placeholder="число" value={input} disabled={!task}
            aria-invalid={verdict && verdict !== 'ok' ? true : undefined}
            onChange={(e) => { setInput(e.target.value); if (verdict) setVerdict(null); }}
          />
          <div className="sg-trainer-preview">Число с точкой или запятой: 1.15 или 1,15. Засчитывается с точностью до 5 %.</div>
          <div className="sg-lab-buttons">
            <Button variant="primary" size="sm" type="submit" disabled={!task || !input.trim()}>Проверить</Button>
            <Button variant="ghost" size="sm" onClick={() => { if (shown === 'hint') setCounted(true); setShown(shown === 'none' ? 'hint' : 'answer'); }} disabled={!task || shown === 'answer'}>
              {shown === 'none' ? 'Подсказка' : 'Показать ответ'}
            </Button>
            <Button variant="ghost" size="sm" onClick={next}>Новая задача</Button>
          </div>
        </form>
        {verdict && (
          <div className={`rz-quiz-explain ${verdict === 'ok' ? 'is-correct' : 'is-wrong'}`} role="status">
            <strong>{verdict === 'ok' ? '✓ ' : '✕ '}</strong>{MESSAGE[verdict]}
          </div>
        )}
        {task && shown !== 'none' && <div className="sg-trainer-hint"><strong>Подсказка. </strong><Rich>{task.hint}</Rich></div>}
        {task && shown === 'answer' && (
          <div className="sg-trainer-ans">
            <strong>Ответ.</strong>
            <TeX tex={task.ans} block />
            <p><Rich>{task.sol}</Rich></p>
          </div>
        )}
      </div>
    </section>
  );
}
