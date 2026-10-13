export interface ScoreProps { correct: number; answered: number; total: number }

/** Счётчик пробной контрольной. */
export function Score({ correct = 0, answered = 0, total = 0 }: ScoreProps) {
  const left = Math.max(0, total - answered);
  return (
    <div className="rz-score" aria-live="polite">
      <span className="rz-score-big">{correct}</span>
      <span className="rz-score-of">из {answered} верно</span>
      <span className="rz-score-left">{left ? `осталось ${left}` : 'всё отвечено'}</span>
    </div>
  );
}
