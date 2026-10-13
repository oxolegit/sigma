import { useId } from 'react';

export interface SelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange?: (v: string) => void;
}

/** Выпадающий список для ручек лаборатории — когда вариантов больше четырёх и переключатель не помещается.
 *  Подпись связана со списком через for/id, а не обёрткой: иначе в доступное имя попадает и выбранный вариант. */
export function Select({ label, options, value, onChange }: SelectProps) {
  const id = useId();
  return (
    <div className="rz-select">
      <label className="rz-select-label" htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange?.(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
