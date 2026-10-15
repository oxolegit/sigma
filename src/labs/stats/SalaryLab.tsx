import { LabFrame, Slider, type LegendItem } from '../../components';
import { useState } from 'react';
import { useCanvas } from '../../lib/canvas';
import { decadeLabel, decadeTicks, drawFrame, markerLine } from '../../lib/plot';
import { token } from '../../lib/theme';
import { tableStats } from './core';
import { text } from './draw';

/** Город Ч с лекции: 10⁶ жителей, зарплата и доля людей. */
const CITY = [[1000, 0.2], [3000, 0.31], [5000, 0.26], [7000, 0.13], [9000, 0.06], [12000, 0.03], [150000, 0.01]] as const;
const POP = 1e6;

const SERIES = {
  city: { label: 'жители города', color: 'accent', mark: 'bar' },
  guests: { label: 'приезжие', color: 'signal', mark: 'bar' },
  mean: { label: 'средняя зарплата', color: 'signal', mark: 'dash' },
  median: { label: 'медианная зарплата', color: 'ink', mark: 'dash' },
} as const satisfies Record<string, LegendItem>;

const money = (v: number) => Math.round(v).toLocaleString('ru-RU');

/** Лаборатория 4.2: средняя и медианная зарплата — что сделают 100 приезжих с огромной (или крошечной) зарплатой. */
export default function SalaryLab() {
  const [guests, setGuests] = useState(100);
  const [lgPay, setLgPay] = useState(Math.log10(1.5e8));
  const pay = 10 ** lgPay;
  const rows = CITY.map(([x, p]) => ({ x, w: p * POP }));
  const base = tableStats(rows);
  const now = tableStats(guests ? [...rows, { x: pay, w: guests }] : rows);

  const ref = useCanvas((g, w, h) => {
    const xt = decadeTicks(100, 1e9), yt = decadeTicks(1e-5, 1);
    const f = drawFrame(g, w, h, { min: 50, max: 2e9, ticks: xt, format: decadeLabel, label: 'зарплата', log: true }, { min: 1e-5, max: 1, ticks: yt, format: decadeLabel, label: 'доля людей', log: true });
    const total = POP + guests;
    const bar = (x: number, share: number, color: string) => {
      const px = f.X(x), y = f.Y(Math.max(share, 1e-5)), bw = Math.max(6, Math.min(14, w / 60));
      g.save();
      g.globalAlpha = 0.3; g.fillStyle = color; g.fillRect(px - bw / 2, y, bw, f.Y(1e-5) - y);
      g.globalAlpha = 1; g.strokeStyle = color; g.lineWidth = 1.2; g.strokeRect(px - bw / 2 + 0.5, y + 0.5, bw - 1, f.Y(1e-5) - y);
      g.restore();
    };
    f.clip(() => {
      for (const r of rows) bar(r.x, r.w / total, token(SERIES.city.color));
      if (guests) bar(pay, guests / total, token(SERIES.guests.color));
      markerLine(g, f, now.mean, `среднее ${money(now.mean)}`, token(SERIES.mean.color), 0);
      markerLine(g, f, now.median, `медиана ${money(now.median)}`, token(SERIES.median.color), 1);
    });
    if (guests) text(g, `${guests} чел.`, f.X(pay), f.Y(guests / total) - 6, token(SERIES.guests.color), 'center', 'bottom', 600, 11);
  }, [guests, pay, now.mean, now.median]);

  const ratio = now.mean / base.mean;
  return (
    <LabFrame
      n="4.2" kind="2D" title="Средняя и медианная зарплата"
      legend={Object.values(SERIES)}
      readout={[
        { label: 'средняя', value: money(now.mean), unit: `(было ${money(base.mean)})` },
        { label: 'медианная', value: money(now.median), unit: `(было ${money(base.median)})` },
      ]}
      status={{
        tone: Math.abs(ratio - 1) > 0.5 ? 'warn' : 'ok',
        text: `Приезжих — ${(100 * guests / (POP + guests)).toFixed(3)} % населения. Средняя изменилась в ${ratio.toFixed(2)} раза, медиана — ${now.median === base.median ? 'не сдвинулась' : `стала ${money(now.median)}`}.`,
      }}
      controls={<>
        <Slider label="Сколько человек приехало" min={0} max={1000} step={10} value={guests} onChange={setGuests} />
        <Slider label="Их зарплата" min={2} max={Math.log10(1.5e8)} step={0.01} value={lgPay} format={(v) => money(10 ** v)} onChange={setLgPay} />
      </>}
      caption="Рис. 4.2. В городе Ч миллион жителей. Средняя зарплата — сумма всех зарплат, делённая на число людей; её тянет вверх даже горстка очень богатых: 100 человек со 150 млн почти вчетверо поднимают среднее. Медиана — зарплата «серединного» человека: половина получает не больше, половина не меньше. Сотня человек из миллиона её не сдвигает. Обе оси логарифмические."
    >
      <canvas ref={ref} role="img" aria-label={`Средняя зарплата ${money(now.mean)}, медианная ${money(now.median)}`} />
    </LabFrame>
  );
}
