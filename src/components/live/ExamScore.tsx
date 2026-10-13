import { useStore } from '@nanostores/react';
import { $answers, score } from '../../lib/exam';
import { Progress } from '../Progress';
import { Score } from '../Score';

/** Счёт пробной контрольной: верные ответы и сколько вопросов осталось. Прилипает к верху страницы. */
export default function ExamScore({ total }: { total: number }) {
  const { answered, correct } = score(useStore($answers));
  return (
    <div className="sg-exam-score">
      <div className="sg-exam-score-main"><Score correct={correct} answered={answered} total={total} /></div>
      <div className="sg-exam-score-bar"><Progress value={answered} total={total} label="Отвечено" compact /></div>
    </div>
  );
}
