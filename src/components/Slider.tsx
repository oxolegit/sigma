import type { CSSProperties } from 'react';
import { TeX } from './TeX';

export interface SliderProps {
  label?: string; tex?: string; min: number; max: number; step?: number;
  value: number; unit?: string; format?: (v: number) => string; onChange?: (v: number) => void;
}

/**
 * Ползунок параметра лаборатории: обозначение, значение с единицей, нативный range.
 * Под значение заранее отведена ширина самой длинной записи (по min, max и середине),
 * поэтому подпись не переносится и ничего не прыгает, пока тянут бегунок.
 */
export function Slider({ label, tex, min, max, step, value, unit, format = String, onChange }: SliderProps) {
  const text = (v: number) => format(v) + (unit ? ` ${unit}` : '');
  // Пробные значения — по шагу ползунка, иначе середина вроде 18.563 раздувает запас ширины.
  const snap = (v: number) => (step ? min + Math.round((v - min) / step) * step : v);
  const width = Math.max(...[min, max, snap((min + max) / 2), snap(min + (max - min) * 0.37)].map((v) => text(Number(v.toPrecision(12))).length));
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className="rz-slider">
      <span className="rz-slider-head">
        <span className="rz-slider-label">{tex && <TeX tex={tex} />}{label}</span>
        <span className="rz-slider-val" style={{ minWidth: `${width + 1}ch` }}>{text(value)}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step ?? 'any'} value={value}
        style={{ '--fill': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
      />
    </label>
  );
}
