export interface SelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange?: (v: string) => void;
}

/** Выпадающий список для ручек лаборатории — когда вариантов больше четырёх и переключатель не помещается. */
export function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <label className="rz-select">
      <span className="rz-select-label">{label}</span>
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
