import { useEffect, useState } from 'react';

interface Link { n: number; title: string; href: string }
interface Section { id: string; title: string; lab: boolean }

/**
 * Оглавление урока «На этой странице»: разделы (h2) и лаборатории, текущий подсвечивается при прокрутке.
 * На ноутбуке — колонка справа; на телефоне — панель снизу: ‹ урок, «Содержание», урок › и полоска прочитанного.
 */
export default function PageToc({ prev, next }: { prev?: Link; next?: Link }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState('');
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(0);

  useEffect(() => {
    const body = document.querySelector('.sg-article');
    if (!body) return;
    const els = [...body.querySelectorAll<HTMLElement>('.sg-lesson-body > h2[id], .sg-lesson-body figure.rz-lab[id], #check-title')];
    setSections(els.map((el) => ({
      id: el.id,
      title: el.matches('figure') ? (el.querySelector('.rz-lab-title')?.textContent ?? '') : (el.textContent ?? ''),
      lab: el.matches('figure'),
    })));
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    els.forEach((el) => io.observe(el));
    const onScroll = () => {
      const h = document.documentElement;
      setRead(Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); };
  }, []);

  const list = (
    <ol className="sg-toc-list">
      {sections.map((s) => (
        <li key={s.id} className={s.lab ? 'is-lab' : undefined}>
          <a href={`#${encodeURIComponent(s.id)}`} aria-current={s.id === active ? 'location' : undefined} onClick={() => setOpen(false)}>{s.title}</a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav className="sg-toc" aria-label="На этой странице">
        <div className="sg-toc-title">На этой странице</div>
        {list}
      </nav>
      <div className="sg-lbar" data-open={open || undefined}>
        <div className="sg-lbar-read" style={{ transform: `scaleX(${read})` }} aria-hidden="true" />
        {open && <div className="sg-lbar-sheet" role="dialog" aria-label="Содержание урока">{list}</div>}
        <div className="sg-lbar-row">
          {prev ? <a className="sg-lbar-btn" href={prev.href} aria-label={`Урок ${prev.n}. ${prev.title}`}>‹ {prev.n}</a> : <span className="sg-lbar-btn is-off" aria-hidden="true">‹</span>}
          <button type="button" className="sg-lbar-toc" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {sections.find((s) => s.id === active)?.title ?? 'Содержание'}
          </button>
          {next ? <a className="sg-lbar-btn" href={next.href} aria-label={`Урок ${next.n}. ${next.title}`}>{next.n} ›</a> : <span className="sg-lbar-btn is-off" aria-hidden="true">›</span>}
        </div>
      </div>
    </>
  );
}
