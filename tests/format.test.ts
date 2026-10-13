import { describe, expect, it } from 'vitest';
import { energy, percent, sci, sup } from '../src/lib/format';

describe('format', () => {
  it('надстрочный показатель', () => {
    expect(sup(-9)).toBe('⁻⁹');
    expect(sup(23)).toBe('²³');
  });
  it('обычная запись в среднем диапазоне', () => {
    expect(sci(0.0253)).toBe('0.0253');
    expect(sci(2200, 3)).toBe('2200');
    expect(sci(1.5, 3)).toBe('1.50');
  });
  it('научная запись вне диапазона', () => {
    expect(sci(2.86e-9)).toBe('2.86·10⁻⁹');
    expect(sci(1.96e9)).toBe('1.96·10⁹');
  });
  it('мантисса 9.996 округляется в следующий порядок', () => {
    expect(sci(9.996e-9, 3)).toBe('1.00·10⁻⁸');
  });
  it('ноль и бесконечность', () => {
    expect(sci(0)).toBe('0');
    expect(sci(Infinity)).toBe('—');
  });
  it('энергия в подходящих единицах', () => {
    expect(energy(0.0253)).toBe('0.0253 эВ');
    expect(energy(6670)).toBe('6.67 кэВ');
    expect(energy(2e6)).toBe('2.00 МэВ');
  });
  it('проценты', () => {
    expect(percent(0.3412)).toBe('34.1 %');
  });
});
