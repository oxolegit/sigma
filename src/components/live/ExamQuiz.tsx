import { recordAnswer } from '../../lib/exam';
import { Quiz, type QuizProps } from '../Quiz';

/** Вопрос пробной контрольной: ответ засчитывается в общий счёт (ExamScore). */
export default function ExamQuiz(props: Omit<QuizProps, 'onAnswer'> & { n: string }) {
  return <Quiz {...props} onAnswer={(ok) => recordAnswer(props.n, ok)} />;
}
