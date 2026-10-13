import { cx } from '../lib/cx';

export interface ProgressProps { value: number; total: number; label?: string; compact?: boolean }

/** Прогресс по курсу: подпись, счётчик «4 / 10» и дорожка. Значение считает страница. */
export function Progress({ value, total, label = 'Пройдено', compact }: ProgressProps) {
  const t = total || 1;
  const v = Math.max(0, Math.min(value || 0, t));
  return (
    <div className={cx('rz-progress', compact && 'rz-progress-compact')}>
      <div className="rz-progress-head">
        <span>{label}</span>
        <span className="rz-progress-num">{v} / {total}</span>
      </div>
      <div className="rz-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={v}>
        <div className="rz-progress-fill" style={{ width: `${Math.round((v / t) * 100)}%` }} />
      </div>
    </div>
  );
}
