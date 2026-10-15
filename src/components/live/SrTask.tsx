import { useId, useState } from 'react';
import { checkAnswer, type AnswerVerdict } from '../../lib/answer';
import { recordAnswer } from '../../lib/exam';
import { Button } from '../Button';
import { Rich } from '../Rich';

export interface SrAnswer {
  /** Что ввести: «$\bar n$», «$\sigma$», «доля». Формулы — в `$…$`. */
  label: string;
  value: number;
  /** Допуск — доля от ответа; по умолчанию 2 %. */
  tol?: number;
  unit?: string;
}

interface Props {
  /** Номер задачи: «1.2». */
  n: string;
  /** Условие с формулами в `$…$`. */
  q: string;
  answers: SrAnswer[];
  /** Ответ, как он записан в листке: «$\bar n = 3.5$, $\sigma \approx 1.71$». */
  answer: string;
  hint?: string;
  /** Короткий разбор — показывается вместе с ответом. */
  solution?: string;
}

const MESSAGE: Record<AnswerVerdict, string> = {
  ok: 'верно',
  close: 'близко, но не то: проверьте округление и промежуточные шаги',
  wrong: 'неверно',
  unreadable: 'не удалось прочитать число',
};

/**
 * Задача самостоятельной: решаете на бумаге, вводите числа — проверка с допуском на округление.
 * В общий счёт идёт задача, решённая до того, как открыт ответ.
 */
export default function SrTask({ n, q, answers, answer, hint, solution }: Props) {
  const id = useId();
  const [inputs, setInputs] = useState(() => answers.map(() => ''));
  const [verdicts, setVerdicts] = useState<(AnswerVerdict | null)[]>(() => answers.map(() => null));
  const [shown, setShown] = useState<'none' | 'hint' | 'answer'>('none');
  const [state, setState] = useState<'open' | 'solved' | 'revealed'>('open');

  const check = () => {
    const v = answers.map((a, i) => (inputs[i]!.trim() ? checkAnswer(inputs[i]!, a.value, a.tol) : null));
    setVerdicts(v);
    if (state !== 'open') return;
    const all = v.every((x) => x === 'ok');
    if (all) setState('solved');
    recordAnswer(n, all);
  };
  const reveal = () => {
    if (shown === 'none' && hint) { setShown('hint'); return; }
    setShown('answer');
    if (state === 'open') { setState('revealed'); recordAnswer(n, false); }
  };

  return (
    <section className="sg-trainer sg-sr-task" aria-labelledby={`${id}-h`}>
      <header className="sg-trainer-head">
        <span className="rz-lab-tag" id={`${id}-h`}>Задача {n}</span>
        <span className="sg-trainer-score" aria-live="polite">
          {state === 'solved' ? '✓ решена' : state === 'revealed' ? 'ответ открыт' : ''}
        </span>
      </header>
      <div className="sg-trainer-body">
        <p className="sg-trainer-q"><Rich>{q}</Rich></p>
        <form className="sg-sr-form" onSubmit={(e) => { e.preventDefault(); check(); }}>
          {answers.map((a, i) => (
            <div className="sg-sr-field" key={i}>
              <label htmlFor={`${id}-${i}`} className="sg-trainer-label"><Rich>{a.label}</Rich>{a.unit ? `, ${a.unit}` : ''}</label>
              <input
                id={`${id}-${i}`} className="sg-field" type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
                placeholder="число" value={inputs[i]} aria-describedby={`${id}-${i}-v`}
                aria-invalid={verdicts[i] && verdicts[i] !== 'ok' ? true : undefined}
                onChange={(e) => {
                  const next = [...inputs]; next[i] = e.target.value; setInputs(next);
                  if (verdicts[i]) { const v = [...verdicts]; v[i] = null; setVerdicts(v); }
                }}
              />
              <span id={`${id}-${i}-v`} className={`sg-sr-verdict${verdicts[i] ? ` is-${verdicts[i] === 'ok' ? 'ok' : 'bad'}` : ''}`} role="status">
                {verdicts[i] && `${verdicts[i] === 'ok' ? '✓' : '✕'} ${MESSAGE[verdicts[i]!]}`}
              </span>
            </div>
          ))}
          <div className="sg-lab-buttons">
            <Button variant="primary" size="sm" type="submit" disabled={inputs.every((x) => !x.trim())}>Проверить</Button>
            <Button variant="ghost" size="sm" onClick={reveal} disabled={shown === 'answer'}>
              {shown === 'none' && hint ? 'Подсказка' : 'Показать ответ'}
            </Button>
          </div>
        </form>
        <p className="sg-sr-syntax">Дробь — 2/3, степень — 10^32 или 1.5e32, экспонента — e^(-0.1), проценты — 9.5 %. Ответ засчитывается с точностью до 2 %.</p>
        {hint && shown !== 'none' && <div className="sg-trainer-hint"><strong>Подсказка. </strong><Rich>{hint}</Rich></div>}
        {shown === 'answer' && (
          <div className="sg-trainer-ans">
            <strong>Ответ. </strong><Rich>{answer}</Rich>
            {solution && <p><Rich>{solution}</Rich></p>}
          </div>
        )}
      </div>
    </section>
  );
}
