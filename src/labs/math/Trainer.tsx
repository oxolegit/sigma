import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '../../components';
import { MathText } from '../../components/MathText';
import { TeX } from '../../components/TeX';
import { previewTex, safeCheck, type Verdict } from '../../lib/expr';
import { mulberry32 } from '../../lib/rng';
import { makeTask, problemType, type Task } from './problems';

interface Props {
  /** Номер тренажёра в уроке, например «1.1». */
  n?: string;
  title?: string;
  /** id типов задач из problems.ts. */
  types: string[];
}

/** Подсказка по записи ответа — одна на все тренажёры. */
const SYNTAX = 'Умножение — *, степень — ^, корень — sqrt(x), модуль — |x|. Функции: sin, cos, tg, ctg, arcsin, arctg, ln, e^x. Пример: 3*x^2*cos(x) - 2/x.';

/**
 * Тренажёр: случайная задача выбранного типа, ввод с предпросмотром формулы, проверка численно.
 * Задача создаётся только в браузере (после монтирования): на сервере случайных чисел нет.
 */
export default function Trainer({ n, title = 'Тренажёр', types }: Props) {
  const list = types.map((id) => problemType(id)).filter(Boolean) as NonNullable<ReturnType<typeof problemType>>[];
  const [typeId, setTypeId] = useState(list[0]?.id ?? '');
  const [rng] = useState(() => mulberry32((Date.now() ^ (Math.random() * 2 ** 31)) | 0));
  const [task, setTask] = useState<Task | null>(null);
  const [input, setInput] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [shown, setShown] = useState<'none' | 'hint' | 'answer'>('none');
  const [solved, setSolved] = useState(0);
  /** Эта задача уже засчитана (или ответ подсмотрен — тогда не засчитывается). */
  const [counted, setCounted] = useState(false);
  const inputId = useId();

  const next = (id = typeId) => {
    const type = problemType(id);
    if (!type) return;
    setTask(makeTask(type, rng));
    setInput('');
    setVerdict(null);
    setShown('none');
    setCounted(false);
  };
  useEffect(() => { next(); /* первая задача — после монтирования */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    if (!input.trim()) return null;
    try { return previewTex(input); } catch { return null; }
  }, [input]);

  const check = () => {
    if (!task || !input.trim()) return;
    const v = safeCheck(task.check, input);
    setVerdict(v);
    if (v.ok && !counted) { setSolved((s) => s + 1); setCounted(true); }
  };

  return (
    <section className="sg-trainer" aria-label={title}>
      <header className="sg-trainer-head">
        <span className="rz-lab-tag">{`Тренажёр${n ? ` ${n}` : ''}`}</span>
        <span className="sg-trainer-title">{title}</span>
        <span className="sg-trainer-score" aria-live="polite">решено {solved}</span>
      </header>

      {list.length > 1 && (
        <div className="sg-trainer-types" role="radiogroup" aria-label="Тип задач">
          {list.map((t) => (
            <button
              key={t.id} type="button" role="radio" aria-checked={t.id === typeId}
              className={t.id === typeId ? 'is-active' : undefined}
              onClick={() => { setTypeId(t.id); next(t.id); }}
            >{t.name}</button>
          ))}
        </div>
      )}

      <div className="sg-trainer-body">
        {task ? <MathText className="sg-trainer-q">{task.q}</MathText> : <p className="sg-trainer-q">Готовим задачу…</p>}

        <form className="sg-trainer-form" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <label htmlFor={inputId} className="sg-trainer-label">{task ? <MathText as="span">{task.label}</MathText> : 'Ответ'}</label>
          <input
            id={inputId} className="sg-field" type="text" inputMode="text" autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder={task?.placeholder} value={input} disabled={!task}
            onChange={(e) => { setInput(e.target.value); if (verdict && !verdict.ok) setVerdict(null); }}
          />
          <div className="sg-trainer-preview" aria-hidden="true">{preview ? <TeX tex={preview} /> : <span>{SYNTAX}</span>}</div>
          <div className="sg-lab-buttons">
            <Button variant="primary" size="sm" type="submit" disabled={!task || !input.trim()}>Проверить</Button>
            <Button variant="ghost" size="sm" onClick={() => { if (shown === 'hint') setCounted(true); setShown(shown === 'none' ? 'hint' : 'answer'); }} disabled={!task || shown === 'answer'}>
              {shown === 'none' ? 'Подсказка' : 'Показать ответ'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => next()}>Новая задача</Button>
          </div>
        </form>

        {verdict && (
          <div className={`rz-quiz-explain ${verdict.ok ? 'is-correct' : 'is-wrong'}`} role="status">
            <strong>{verdict.ok ? '✓ Верно.' : '✕ '}</strong>{!verdict.ok && verdict.msg}
          </div>
        )}
        {task && shown !== 'none' && <div className="sg-trainer-hint"><strong>Подсказка. </strong><MathText as="span">{task.hint}</MathText></div>}
        {task && shown === 'answer' && (
          <div className="sg-trainer-ans">
            <strong>Ответ.</strong>
            <TeX tex={task.ans} block />
            {task.sol && <MathText>{task.sol}</MathText>}
          </div>
        )}
      </div>
    </section>
  );
}
