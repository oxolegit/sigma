import { cx } from '../lib/cx';

export interface SegmentedProps {
  label?: string; options: (string | { value: string; label: string })[];
  value: string; onChange?: (v: string) => void;
}

/** Переключатель из 2–4 взаимоисключающих вариантов. */
export function Segmented({ label, options, value, onChange }: SegmentedProps) {
  return (
    <div className="rz-seg-wrap">
      {label && <span className="rz-seg-label">{label}</span>}
      <div className="rz-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const on = v === value;
          return (
            <button key={v} type="button" role="radio" aria-checked={on} className={cx('rz-seg-opt', on && 'is-on')} onClick={() => onChange?.(v)}>
              {typeof o === 'object' ? o.label : o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
