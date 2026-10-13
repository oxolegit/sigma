import { Button } from './Button';

export interface LessonFooterProps { done?: boolean; onToggle?: () => void; next?: { n?: number; title: string; href?: string } }

/** Низ урока: «Урок пройден» (повторное нажатие снимает отметку) и ссылка на следующий урок. */
export function LessonFooter({ done, onToggle, next }: LessonFooterProps) {
  return (
    <footer className="rz-lfoot">
      <Button variant={done ? 'quiet' : 'primary'} onClick={onToggle} aria-pressed={!!done}>
        {done ? '✓ Урок пройден' : 'Урок пройден'}
      </Button>
      {next && (
        <a className="rz-lfoot-next" href={next.href ?? '#'}>
          <span className="rz-lfoot-k">{'Следующий урок' + (next.n ? ` ${next.n}` : '')}</span>
          <span className="rz-lfoot-t">{next.title} →</span>
        </a>
      )}
    </footer>
  );
}
