import { useEffect, useState } from 'react';
import { Button } from '../Button';
import { Progress } from '../Progress';
import { Rich } from '../Rich';
import { Segmented } from '../Segmented';
import { TeX } from '../TeX';

interface Item { title: string; tex: string; note?: string }
interface Props {
  /** Ключ localStorage для выученных: sigma:<курс>:prep<номер>:known. */
  storageKey: string;
  groups: { title: string; items: Item[] }[];
}

const read = (key: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const write = (key: string, ids: string[]) => {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
};

/**
 * Формулы наизусть. «Список» — всё открыто, для чтения и печати.
 * «Проверка себя» — видно только название: вспомните формулу, откройте и честно отметьте «помню» или «повторить».
 * Выученные помнятся в браузере по названию формулы.
 */
export default function MemoCards({ storageKey, groups }: Props) {
  const [mode, setMode] = useState<'list' | 'test'>('list');
  const [known, setKnown] = useState<string[]>([]);
  const [open, setOpen] = useState<string[]>([]);
  const [hideKnown, setHideKnown] = useState(false);
  useEffect(() => { setKnown(read(storageKey)); }, [storageKey]);

  const id = (g: number, i: number) => `${groups[g]!.title}/${groups[g]!.items[i]!.title}`;
  const all = groups.flatMap((g, gi) => g.items.map((_, i) => id(gi, i)));
  const knownCount = all.filter((x) => known.includes(x)).length;

  const mark = (key: string, on: boolean) => {
    const next = on ? [...new Set([...known, key])] : known.filter((x) => x !== key);
    setKnown(next);
    write(storageKey, next);
    setOpen(open.filter((x) => x !== key));
  };
  const reset = () => { setKnown([]); write(storageKey, []); setOpen([]); };

  return (
    <div className="sg-memo">
      <div className="sg-memo-bar sg-no-print">
        <Segmented label="Режим" value={mode} onChange={(v) => { setMode(v as 'list' | 'test'); setOpen([]); }}
          options={[{ value: 'list', label: 'Список' }, { value: 'test', label: 'Проверка себя' }]} />
        <div className="sg-memo-progress">
          <Progress value={knownCount} total={all.length} label="Помню" compact />
        </div>
        {mode === 'test' && (
          <div className="sg-memo-tools">
            <label className="sg-memo-hide">
              <input type="checkbox" checked={hideKnown} onChange={(e) => setHideKnown(e.target.checked)} /> Скрыть выученные
            </label>
            <Button variant="ghost" size="sm" onClick={reset} disabled={!knownCount}>Сбросить</Button>
          </div>
        )}
      </div>
      {mode === 'test' && hideKnown && knownCount === all.length && (
        <p className="sg-memo-empty">Все формулы отмечены как выученные. Сбросьте отметки и пройдите ещё раз накануне работы.</p>
      )}

      {groups.map((g, gi) => {
        const items = g.items.map((it, i) => ({ it, key: id(gi, i) })).filter(({ key }) => !(mode === 'test' && hideKnown && known.includes(key)));
        if (!items.length) return null;
        return (
          <section key={g.title} className="sg-memo-group">
            <h3>{g.title}</h3>
            <div className="sg-memo-grid">
              {items.map(({ it, key }) => {
                const isKnown = known.includes(key);
                const shown = mode === 'list' || open.includes(key);
                return (
                  <div key={key} className={`sg-memo-card${isKnown ? ' is-known' : ''}`}>
                    <div className="sg-memo-head">
                      <span className="sg-memo-title">{it.title}</span>
                      {isKnown && <span className="sg-memo-badge">✓ помню</span>}
                    </div>
                    <div className={shown ? 'sg-memo-body' : 'sg-memo-body is-hidden'}>
                      <TeX tex={it.tex} block />
                      {it.note && <p className="sg-memo-note"><Rich>{it.note}</Rich></p>}
                    </div>
                    {mode === 'test' && (
                      <div className="sg-memo-actions sg-no-print">
                        {!shown
                          ? <Button size="sm" onClick={() => setOpen([...open, key])}>Показать формулу</Button>
                          : <>
                              <Button variant="primary" size="sm" onClick={() => mark(key, true)}>Помню</Button>
                              <Button variant="ghost" size="sm" onClick={() => mark(key, false)}>Повторить</Button>
                            </>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
