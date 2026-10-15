import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TeX } from '../TeX';

/** Запись индекса поиска — собирается на сборке в /search.json (src/pages/search.json.ts). */
export interface SearchItem {
  type: 'course' | 'lesson' | 'lab' | 'formula';
  title: string;
  /** Курс, урок — серым под заголовком. */
  sub: string;
  href: string;
  /** Текст для поиска помимо заголовка: «что спросят», параграф, TeX. */
  text?: string;
  tex?: string;
}

const GROUPS: { type: SearchItem['type']; title: string }[] = [
  { type: 'course', title: 'Курсы' },
  { type: 'lesson', title: 'Уроки' },
  { type: 'lab', title: 'Лаборатории' },
  { type: 'formula', title: 'Формулы' },
];
const PER_GROUP = 6;

/** Без регистра, ё = е, без TeX-разметки: «Вайцзеккер» найдёт и «Вайцзекера». */
export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\\[a-z]+|[{}^_$\\]/g, ' ').replace(/\s+/g, ' ');

let cache: Promise<SearchItem[]> | null = null;
const load = () => (cache ??= fetch('/search.json').then((r) => r.json() as Promise<SearchItem[]>).catch(() => { cache = null; return []; }));

function score(it: SearchItem, words: string[]): number {
  const title = norm(it.title), all = `${title} ${norm(it.sub)} ${norm(it.text ?? '')}`;
  if (!words.every((w) => all.includes(w))) return -1;
  // Совпадения в заголовке важнее; начало слова — ещё важнее.
  return words.reduce((s, w) => s + (title.startsWith(w) ? 4 : title.includes(` ${w}`) ? 3 : title.includes(w) ? 2 : 0), 0);
}

/** Диалог поиска: поле, результаты по группам, стрелки и Enter, Esc закрывает. */
export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    input.current?.focus();
    void load().then(setItems);
    const close = () => onClose();
    d.addEventListener('close', close);
    return () => d.removeEventListener('close', close);
  }, [onClose]);

  const groups = useMemo(() => {
    const words = norm(q).trim().split(' ').filter(Boolean);
    if (!items || !words.length) return [];
    return GROUPS.map((g) => ({
      ...g,
      hits: items.filter((it) => it.type === g.type)
        .map((it) => ({ it, s: score(it, words) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, PER_GROUP)
        .map((x) => x.it),
    })).filter((g) => g.hits.length);
  }, [items, q]);
  const flat = groups.flatMap((g) => g.hits);
  useEffect(() => setActive(0), [q]);

  const go = (it: SearchItem | undefined) => { if (it) location.href = it.href; };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[active]); }
  };
  useEffect(() => { ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  let i = -1;
  return (
    <dialog ref={ref} className="sg-search" aria-label="Поиск по сайту" onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
      <div className="sg-search-box">
        <div className="sg-search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Урок, лаборатория, формула…" aria-label="Что найти" role="combobox"
            aria-expanded={flat.length > 0} aria-controls="sg-search-list" aria-activedescendant={flat.length ? `sg-hit-${active}` : undefined}
          />
          <button type="button" className="sg-search-esc" onClick={() => ref.current?.close()}>Esc</button>
        </div>
        <div className="sg-search-list" id="sg-search-list" role="listbox" aria-label="Результаты">
          {!q.trim() && <p className="sg-search-empty">Ищите по названиям уроков, вопросам «Что спросят», лабораториям и формулам. Стрелки — выбор, Enter — перейти.</p>}
          {q.trim() && items && !flat.length && <p className="sg-search-empty">Ничего не нашлось. Попробуйте другое слово — например, «Пуассон» или «пробег».</p>}
          {q.trim() && !items && <p className="sg-search-empty">Загружаю…</p>}
          {groups.map((g) => (
            <div key={g.type} className="sg-search-group" role="group" aria-label={g.title}>
              <div className="sg-search-gtitle">{g.title}</div>
              {g.hits.map((it) => {
                i += 1;
                const n = i;
                return (
                  <a
                    key={`${it.type}-${it.href}-${it.title}`} id={`sg-hit-${n}`} href={it.href} role="option" aria-selected={n === active}
                    className="sg-search-hit" onMouseMove={() => setActive(n)}
                  >
                    <span className={`sg-search-ico is-${it.type}`} aria-hidden="true">{it.type === 'course' ? 'Σ' : it.type === 'lesson' ? '§' : it.type === 'lab' ? '∿' : 'ƒ'}</span>
                    <span className="sg-search-text">
                      <span className="sg-search-title">{it.title}</span>
                      {it.tex ? <span className="sg-search-tex"><TeX tex={it.tex} /></span> : null}
                      <span className="sg-search-sub">{it.sub}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}
