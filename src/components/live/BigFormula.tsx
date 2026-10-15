import { useEffect, useMemo, useRef, useState } from 'react';
import { Rich } from '../Rich';
import { renderInfoTex } from './FormulaPopup';

export interface BigFormulaProps {
  /** TeX с метками \htmlData{s=…} — то, что видно. */
  display: string;
  /** Обычный TeX — по нему попап находит запись. */
  tex: string;
  title: string;
  symbols: { s: string; tex: string; text: string }[];
}

/**
 * Крупная формула на главной: символы подписываются при наведении (или по очереди сами, пока не трогали),
 * клик открывает попап «всё о формуле» — тот же, что в уроках.
 */
export default function BigFormula({ display, tex, title, symbols }: BigFormulaProps) {
  const html = useMemo(() => renderInfoTex(display), [display]);
  const [sym, setSym] = useState<string | null>(symbols[0]?.s ?? null);
  const touched = useRef(false);
  const box = useRef<HTMLSpanElement>(null);

  // Пока посетитель не навёл мышь, подписи сами перебирают символы — видно, что формула «живая».
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    const t = setInterval(() => { if (touched.current) return; i = (i + 1) % symbols.length; setSym(symbols[i]!.s); }, 2200);
    return () => clearInterval(t);
  }, [symbols]);
  useEffect(() => {
    box.current?.querySelectorAll('[data-s]').forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-s') === sym));
  }, [sym, html]);

  const current = symbols.find((s) => s.s === sym);
  const open = () => dispatchEvent(new CustomEvent('sigma:formula', { detail: { tex } }));
  return (
    <figure className="sg-bigf">
      <button
        type="button" className="sg-bigf-btn" onClick={open} aria-label={`${title} — открыть разбор формулы`}
        onMouseOver={(e) => { const s = (e.target as Element).closest('[data-s]')?.getAttribute('data-s'); if (s) { touched.current = true; setSym(s); } }}
      >
        <span ref={box} className="sg-bigf-tex" dangerouslySetInnerHTML={{ __html: html }} />
      </button>
      <figcaption className="sg-bigf-cap">
        <span className="sg-bigf-sym">{current ? <Rich>{`$${current.tex}$`}</Rich> : null}</span>
        <span>{current?.text}</span>
      </figcaption>
      <div className="sg-bigf-note">{title} · нажмите на формулу — откроется разбор</div>
    </figure>
  );
}
