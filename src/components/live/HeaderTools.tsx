import { useEffect, useState } from 'react';
import { getTheme, onThemeChange, setTheme, type Theme } from '../../lib/theme';
import SearchDialog from './SearchDialog';

/** Инструменты шапки: поиск по сайту (⌘K / Ctrl+K, «/») и переключатель темы. */
export default function HeaderTools() {
  const [open, setOpen] = useState(false);
  const [theme, setT] = useState<Theme>('light');
  const [mac, setMac] = useState(false);

  useEffect(() => {
    setT(getTheme());
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const off = onThemeChange(setT);
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(true); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setOpen(true); }
    };
    addEventListener('keydown', onKey);
    return () => { off(); removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="sg-top-tools">
      <button type="button" className="sg-search-btn" onClick={() => setOpen(true)} aria-label="Поиск по сайту" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>Поиск</span>
        <kbd>{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <button
        type="button" className="sg-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark'
          ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>}
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
