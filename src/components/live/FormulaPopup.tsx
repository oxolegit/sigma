import katex from 'katex';
import { useEffect, useMemo, useRef, useState } from 'react';
import { findInfo, normTex, type FormulaIndex, type FormulaInfo } from '../../lib/formulas';
import { Rich } from '../Rich';
import { Steps } from '../Steps';

let cache: Promise<FormulaIndex> | null = null;
const load = () => (cache ??= fetch('/formulas.json').then((r) => r.json() as Promise<FormulaIndex>).catch(() => { cache = null; return { items: [], places: {}, names: {} }; }));

/** Формула с метками символов: \htmlData{s=…} разрешён только в наших записях. */
export function renderInfoTex(tex: string): string {
  try {
    return katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: false, trust: (c) => c.command === '\\htmlData' });
  } catch {
    return `<span class="rz-tex-raw">${tex.replace(/</g, '&lt;')}</span>`;
  }
}

/** Выносные формулы, которые открывают попап: в тексте, выводах и шпаргалке; не в лабораториях и не в самом попапе. */
const SELECTOR = '.katex-display';
const skip = (el: Element) => !!el.closest('.rz-lab, .sg-formula-pop, .sg-search, .sg-bigf');
const texOf = (el: Element) => el.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? '';
const inline = (tex: string) => `$${tex}$`;

/** Раздел урока, где стоит формула, — заголовок попапа, если разбора ещё нет. */
function sectionOf(el: Element | null): string {
  let n: Element | null = el?.closest('.sg-lesson-body > *, .sg-exam-body > *') ?? null;
  while (n) {
    if (/^H[23]$/.test(n.tagName)) return n.textContent ?? '';
    n = n.previousElementSibling;
  }
  return '';
}

/** Помечает формулы как кнопки — с фокусом с клавиатуры и подписью для скринридера. */
function mark(root: ParentNode) {
  root.querySelectorAll(SELECTOR).forEach((el) => {
    if (skip(el) || el.hasAttribute('data-formula')) return;
    el.setAttribute('data-formula', '');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Формула — подробнее');
  });
}

/** Остров на каждой странице: клик по выносной формуле или событие sigma:formula открывают попап «всё о формуле». */
export default function FormulaPopup() {
  const [tex, setTex] = useState<string | null>(null);
  const [ctx, setCtx] = useState('');
  const [index, setIndex] = useState<FormulaIndex | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    mark(document);
    const mo = new MutationObserver(() => mark(document));
    mo.observe(document.body, { childList: true, subtree: true });
    const open = (t: string, from: HTMLElement | null) => {
      if (!t) return;
      opener.current = from;
      setCtx(sectionOf(from));
      setTex(t);
      void load().then(setIndex);
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(SELECTOR);
      if (!el || skip(el)) return;
      // Выделение текста мышью — не клик по формуле.
      if (String(getSelection() ?? '').length > 0) return;
      open(texOf(el), el as HTMLElement);
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if ((e.key === 'Enter' || e.key === ' ') && el.matches?.('[data-formula]')) { e.preventDefault(); open(texOf(el), el); }
    };
    const onEvent = (e: Event) => open((e as CustomEvent<{ tex: string }>).detail.tex, document.activeElement as HTMLElement);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    addEventListener('sigma:formula', onEvent);
    return () => {
      mo.disconnect();
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      removeEventListener('sigma:formula', onEvent);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d || !tex) return;
    if (!d.open) d.showModal();
    const onClose = () => { setTex(null); opener.current?.focus(); };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, [tex]);

  if (!tex) return null;
  return (
    <dialog ref={dialog} className="sg-formula-pop" aria-label="О формуле" onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
      <FormulaCardFull tex={tex} ctx={ctx} index={index} onClose={() => dialog.current?.close()} />
    </dialog>
  );
}

function FormulaCardFull({ tex, ctx, index, onClose }: { tex: string; ctx: string; index: FormulaIndex | null; onClose: () => void }) {
  const info: FormulaInfo | undefined = index ? findInfo(index, tex) : undefined;
  const key = normTex(tex);
  const title = info?.title ?? index?.names[key] ?? (ctx || 'Формула из урока');
  // Где встречается: для формулы с разбором — все записи, где узнаётся она же (по строкам match), иначе — точное совпадение.
  const matches = info?.match.map(normTex) ?? [];
  const placeList = info && index
    ? Object.entries(index.places).filter(([k]) => k === key || matches.some((m) => k.includes(m))).flatMap(([, v]) => v)
    : (index?.places[key] ?? []);
  const places = placeList
    .filter((p, i, a) => a.findIndex((q) => q.href === p.href) === i)
    .filter((p) => p.href.split('#')[0] !== location.pathname);
  const [sym, setSym] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => renderInfoTex(info?.display ?? tex), [info, tex]);
  const box = useRef<HTMLDivElement>(null);

  // Длинная формула: уменьшаем кегль, пока не влезет (не меньше 1em), остаток — прокрутка.
  useEffect(() => {
    const k = box.current?.querySelector<HTMLElement>('.katex');
    if (!k || !box.current) return;
    for (let size = 1.7; size >= 1; size -= 0.1) {
      k.style.fontSize = `${size}em`;
      if (box.current.scrollWidth <= box.current.clientWidth) break;
    }
  }, [html]);

  // Подсветка символа: в формуле — все его вхождения, в таблице — строка.
  useEffect(() => {
    box.current?.querySelectorAll('[data-s]').forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-s') === sym));
  }, [sym, html]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(tex); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* буфер недоступен — ничего */ }
  };
  const current = info?.symbols.find((s) => s.s === sym);

  return (
    <article className="sg-fp">
      <header className="sg-fp-head">
        <div>
          <div className="sg-eyebrow sg-eyebrow-accent">{info ? 'Формула' : 'Формула · разбор готовится'}</div>
          <h2 className="sg-fp-title">{title}</h2>
        </div>
        <button type="button" className="sg-icon-btn" onClick={onClose} aria-label="Закрыть">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <div
        ref={box} className="sg-fp-formula"
        onMouseOver={(e) => { const s = (e.target as Element).closest('[data-s]')?.getAttribute('data-s'); if (s) setSym(s); }}
        onMouseLeave={() => setSym(null)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {info?.symbols.length ? (
        <p className="sg-fp-hint" aria-live="polite">
          {current
            ? <><Rich>{inline(current.tex)}</Rich> — {current.text}{current.unit ? `, ${current.unit}` : ''}</>
            : 'Наведите на символ в формуле или на строку ниже — подсветится его смысл.'}
        </p>
      ) : null}

      {info ? (
        <>
          <p className="sg-fp-meaning">{info.meaning}</p>
          {info.symbols.length > 0 && (
            <section>
              <h3>Что есть что</h3>
              <table className="sg-fp-symbols">
                <tbody>
                  {info.symbols.map((s) => (
                    <tr key={s.s} className={s.s === sym ? 'is-on' : undefined} onMouseEnter={() => setSym(s.s)} onMouseLeave={() => setSym(null)} onFocus={() => setSym(s.s)} tabIndex={0}>
                      <th scope="row"><Rich>{inline(s.tex)}</Rich></th>
                      <td>{s.text}</td>
                      <td className="sg-fp-unit">{s.unit ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {info.when && <section><h3>Когда применять</h3><p><Rich>{info.when}</Rich></p></section>}
          {info.derivation.length > 0 && <section><h3>Откуда берётся</h3><Steps steps={info.derivation} /></section>}
          {info.example && <section><h3>Пример</h3><p className="sg-fp-example"><Rich>{info.example}</Rich></p></section>}
        </>
      ) : (
        <p className="sg-fp-meaning is-muted">Подробный разбор этой формулы ещё не написан — разборы добавляются постепенно. Пока можно скопировать TeX{places.length ? ' или посмотреть, где ещё она встречается' : ''}.</p>
      )}

      {places.length > 0 && (
        <section>
          <h3>Где ещё встречается</h3>
          <ul className="sg-fp-places">{places.map((p) => <li key={p.href}><a href={p.href}>{p.title}</a></li>)}</ul>
        </section>
      )}

      <footer className="sg-fp-foot">
        <button type="button" className="rz-btn rz-btn-quiet rz-btn-sm" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать TeX'}</button>
      </footer>
    </article>
  );
}
