import { useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Rich } from './Rich';

export interface QuizProps {
  n?: string; question: ReactNode; options: { text: ReactNode; correct?: boolean }[];
  explain: ReactNode; onAnswer?: (correct: boolean) => void;
}

const letter = (i: number) => String.fromCharCode(0x410 + i); // А, Б, В, Г…

/** Вопрос с вариантами: один ответ без повторной попытки, затем объяснение. */
export function Quiz({ n, question, options, explain, onAnswer }: QuizProps) {
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  const ok = answered && !!options[pick]?.correct;
  return (
    <div className="rz-quiz">
      <div className="rz-quiz-q">
        {n && <span className="rz-quiz-n">{n}</span>}
        <div><Rich>{question}</Rich></div>
      </div>
      <div className="rz-quiz-opts">
        {options.map((o, i) => {
          const state = !answered ? '' : o.correct ? 'is-correct' : i === pick ? 'is-wrong' : 'is-dim';
          const mark = answered && o.correct ? '✓' : answered && i === pick ? '✕' : letter(i);
          return (
            <button
              key={i} type="button" disabled={answered} className={cx('rz-quiz-opt', state)}
              onClick={() => { setPick(i); onAnswer?.(!!o.correct); }}
            >
              <span className="rz-quiz-mark">{mark}</span>
              <span><Rich>{o.text}</Rich></span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={cx('rz-quiz-explain', ok ? 'is-correct' : 'is-wrong')} role="status">
          <strong>{ok ? 'Верно. ' : 'Неверно. '}</strong><Rich>{explain}</Rich>
        </div>
      )}
    </div>
  );
}
