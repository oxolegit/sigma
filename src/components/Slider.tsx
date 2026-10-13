import { TeX } from './TeX';

export interface SliderProps {
  label?: string; tex?: string; min: number; max: number; step?: number;
  value: number; unit?: string; format?: (v: number) => string; onChange?: (v: number) => void;
}

/** Ползунок параметра лаборатории: обозначение, значение с единицей, нативный range. */
export function Slider({ label, tex, min, max, step, value, unit, format = String, onChange }: SliderProps) {
  return (
    <label className="rz-slider">
      <span className="rz-slider-head">
        <span className="rz-slider-label">{tex && <TeX tex={tex} />}{label}</span>
        <span className="rz-slider-val">{format(value) + (unit ? ` ${unit}` : '')}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step ?? 'any'} value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
      />
    </label>
  );
}
