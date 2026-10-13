import { describe, expect, it } from 'vitest';
import { countDone, decodeProgress, encodeProgress, isDone, lessonKey, type ProgressMap } from '../src/lib/progress';

const map = (...keys: string[]): ProgressMap => Object.fromEntries(keys.map((k) => [k, true]));

describe('кодек прогресса для ссылки', () => {
  it('уроки 1 и 4 курса — маска 0b1001 = 9', () => {
    expect(encodeProgress(map('tpn:1', 'tpn:4'))).toBe('tpn.9');
  });
  it('несколько курсов сортируются по имени', () => {
    expect(encodeProgress(map('tpn:2', 'math:1'))).toBe('math.1,tpn.2');
  });
  it('пустой прогресс — пустая строка', () => {
    expect(encodeProgress({})).toBe('');
    expect(decodeProgress('')).toEqual([]);
  });
  it('туда и обратно без потерь, в том числе для уроков дальше 53-го', () => {
    const m = map('tpn:1', 'tpn:4', 'tpn:10', 'math:3', 'math:60');
    const back = decodeProgress(encodeProgress(m)).map(([c, n]) => lessonKey(c, n)).sort();
    expect(back).toEqual(Object.keys(m).sort());
  });
  it('мусор в ссылке пропускается', () => {
    expect(decodeProgress('tpn.9,<script>,math.!,x')).toEqual([['tpn', 1], ['tpn', 4]]);
  });
});

describe('подсчёт', () => {
  const m = map('tpn:1', 'tpn:2', 'math:1');
  it('isDone различает курсы', () => {
    expect(isDone(m, 'tpn', 1)).toBe(true);
    expect(isDone(m, 'math', 2)).toBe(false);
  });
  it('countDone считает только уроки из списка', () => {
    expect(countDone(m, 'tpn', [1, 2, 3])).toBe(2);
    expect(countDone(m, 'tpn', [3, 4])).toBe(0);
  });
});
