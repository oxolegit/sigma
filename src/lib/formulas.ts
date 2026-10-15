/**
 * Узнавание формул по TeX — общее для сборки (/formulas.json) и попапа в браузере.
 * Одна и та же формула пишется по-разному: с пробелами, \, и \quad, с точкой в конце.
 * Нормализация убирает всё, что не меняет смысла, — сравниваются уже строки без них.
 */
export function normTex(tex: string): string {
  return tex
    .replace(/\\(displaystyle|textstyle|left|right|big|Big|bigl|bigr|Bigl|Bigr)(?![a-zA-Z])/g, '')
    .replace(/\\(qquad|quad)(?![a-zA-Z])/g, '')
    .replace(/\\[,;:! ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[.,;]+$/, '');
}

/** Запись «всё о формуле» из src/content/formulas/<курс>.yaml. */
export interface FormulaInfo {
  id: string;
  course: string;
  title: string;
  match: string[];
  display?: string;
  meaning: string;
  symbols: { s: string; tex: string; text: string; unit?: string }[];
  when?: string;
  derivation: { note?: string; tex?: string }[];
  example?: string;
}

/** Где встречается формула: урок или шпаргалка. */
export interface FormulaPlace { title: string; href: string }

export interface FormulaIndex {
  items: FormulaInfo[];
  /** Нормализованный TeX → места на сайте. */
  places: Record<string, FormulaPlace[]>;
  /** Нормализованный TeX → название из шпаргалки (если формула туда вынесена). */
  names: Record<string, string>;
}

/** Подробная запись, если формула её содержит: строки match ищутся внутри нормализованного TeX. */
export function findInfo(index: FormulaIndex, tex: string): FormulaInfo | undefined {
  const n = normTex(tex);
  return index.items.find((it) => it.match.some((m) => n.includes(normTex(m))));
}
