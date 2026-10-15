// Картинка для превью ссылок (public/og.png, 1200×630) и PNG-иконки из favicon.svg.
// Запуск после изменения курсов или бренда: node scripts/og.mjs
// Цифры считаются по контенту так же, как на главной: написанные уроки и импорты лабораторий в MDX.
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const at = (...p) => join(root, ...p);

// --- цифры ---
const lessonsDir = at('src/content/lessons');
let lessons = 0, labs = 0, labs3d = 0;
for (const course of readdirSync(lessonsDir)) {
  for (const f of readdirSync(join(lessonsDir, course)).filter((x) => x.endsWith('.mdx'))) {
    lessons++;
    const body = readFileSync(join(lessonsDir, course, f), 'utf8');
    for (const [, path] of body.matchAll(/^import\s+\w+\s+from\s+['"]@labs\/([\w/]+)['"]/gm)) {
      // Лаборатория — компонент в рамке LabFrame (тренажёр ею не считается), как в lessonStats().
      const src = readFileSync(at('src/labs', `${path}.tsx`), 'utf8');
      if (!src.includes('<LabFrame')) continue;
      labs++;
      if (/kind="3D"/.test(src)) labs3d++;
    }
  }
}
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

// --- шрифты встраиваются, чтобы рендер не зависел от системы ---
const font = (pkg, file) => `data:font/woff2;base64,${readFileSync(at('node_modules/@fontsource', pkg, 'files', file)).toString('base64')}`;
const faces = [
  ['IBM Plex Sans', 400, 'ibm-plex-sans', 'ibm-plex-sans-cyrillic-400-normal.woff2'],
  ['IBM Plex Sans', 400, 'ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2'],
  ['IBM Plex Sans', 600, 'ibm-plex-sans', 'ibm-plex-sans-cyrillic-600-normal.woff2'],
  ['IBM Plex Sans', 600, 'ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2'],
  ['Source Serif 4', 400, 'source-serif-4', 'source-serif-4-cyrillic-400-normal.woff2'],
  ['Source Serif 4', 400, 'source-serif-4', 'source-serif-4-latin-400-normal.woff2'],
].map(([family, weight, pkg, file]) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(${font(pkg, file)}) format("woff2")}`).join('\n');

// Цвета — светлая тема из src/styles/tokens.css.
const C = { paper: '#f6f4ee', surface: '#fffdf8', surface2: '#eceae2', rule: '#d9d5c9', ink: '#1b1d21', muted: '#5d6068', accent: '#c2410c', accentSoft: '#feefe3', signal: '#6d3fd0', grid: '#d6d2c6' };
const sigma = (stroke, w) => `<polyline points="18.5,7 18.5,4 5.5,4 12.5,12 5.5,20 18.5,20 18.5,17" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="miter" stroke-linecap="square"/>`;

// Декоративный рисунок справа: гистограмма пробегов, закон ослабления и маркер толщины — как в лаборатории 4.2.
function plot() {
  const W = 420, H = 300, l = 20, b = 280, xs = (x) => l + x * 72, ys = (y) => b - y * 250;
  let bars = '', curve = '';
  for (let i = 0; i < 18; i++) {
    const x = i * 0.27, y = Math.exp(-(x + 0.135)) * (1 + 0.09 * Math.sin(i * 2.3));
    bars += `<rect x="${xs(x) + 1}" y="${ys(y)}" width="${0.27 * 72 - 2}" height="${b - ys(y)}" fill="${C.accent}" fill-opacity="0.18" stroke="${C.accent}" stroke-width="1.5"/>`;
  }
  for (let k = 0; k <= 80; k++) { const x = (k / 80) * 5; curve += `${k ? 'L' : 'M'}${xs(x).toFixed(1)},${ys(Math.exp(-x)).toFixed(1)}`; }
  let grid = '';
  for (let i = 0; i <= 5; i++) grid += `<line x1="${xs(i)}" y1="20" x2="${xs(i)}" y2="${b}" stroke="${C.grid}"/>`;
  for (let j = 0; j <= 4; j++) grid += `<line x1="${l}" y1="${ys(j / 4)}" x2="${xs(5)}" y2="${ys(j / 4)}" stroke="${C.grid}"/>`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${grid}${bars}<path d="${curve}" fill="none" stroke="${C.accent}" stroke-width="3.5"/>
    <line x1="${xs(2)}" y1="20" x2="${xs(2)}" y2="${b}" stroke="${C.signal}" stroke-width="2.5" stroke-dasharray="7 6"/>
    <text x="${xs(2) + 10}" y="44" fill="${C.signal}" font-family="IBM Plex Sans" font-weight="600" font-size="18">X = 2 см</text></svg>`;
}

const chips = [
  `${lessons} ${plural(lessons, 'урок', 'урока', 'уроков')}`,
  `${labs} ${plural(labs, 'лаборатория', 'лаборатории', 'лабораторий')}`,
  `${labs3d} в 3D`,
  'без регистрации',
];

const og = `<!doctype html><html><head><meta charset="utf-8"><style>${faces}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:${C.paper};font-family:"IBM Plex Sans";color:${C.ink};position:relative;overflow:hidden}
.bar{position:absolute;left:0;top:0;width:1200px;height:10px;background:${C.accent}}
.logo{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px;font-weight:600;font-size:40px;letter-spacing:-0.02em}
.logo svg{width:44px;height:44px}
h1{position:absolute;left:72px;top:160px;width:640px;font-weight:600;font-size:60px;line-height:66px;letter-spacing:-0.03em}
p{position:absolute;left:72px;top:372px;width:600px;font-family:"Source Serif 4";font-size:27px;line-height:38px;color:${C.muted}}
.chips{position:absolute;left:72px;bottom:72px;display:flex;gap:12px}
.chips span{padding:9px 18px;border:2px solid ${C.rule};border-radius:999px;background:${C.surface};font-weight:600;font-size:22px}
.chips span:first-child{border-color:${C.accent};color:${C.accent}}
.card{position:absolute;right:64px;top:110px;width:460px;height:380px;padding:20px;background:${C.surface};border:2px solid ${C.rule};border-radius:16px}
.tag{font-weight:600;font-size:16px;letter-spacing:.06em;text-transform:uppercase;color:${C.accent};margin:0 0 10px 20px}
.url{position:absolute;right:64px;bottom:78px;font-weight:600;font-size:22px;color:${C.muted}}
</style></head><body>
<div class="bar"></div>
<div class="logo"><svg viewBox="0 0 24 24">${sigma(C.accent, 2.6)}</svg>Sigma</div>
<h1>Физика и математика, которые можно покрутить руками</h1>
<p>Интерактивные курсы для магистратуры МИФИ: перенос нейтронов, матанализ, матстатистика</p>
<div class="card"><div class="tag">Лаборатория · пробег нейтрона</div>${plot()}</div>
<div class="chips">${chips.map((c) => `<span>${c}</span>`).join('')}</div>
<div class="url">sigma.mslv.space</div>
</body></html>`;

// Иконка: тот же знак, что в favicon.svg, на квадрате accent.
const icon = (size, radius) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:transparent}</style></head><body>
<svg width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" rx="${radius}" fill="${C.accent}"/>
<polyline points="23,10.5 23,7 9,7 16.5,16 9,25 23,25 23,21.5" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="miter" stroke-linecap="square"/></svg></body></html>`;

const browser = await chromium.launch();
const shot = async (html, w, h, file, transparent = false) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: at('public', file), omitBackground: transparent });
  await page.close();
  console.log(file);
};
await shot(og, 1200, 630, 'og.png');
// apple-touch-icon без прозрачности и скругления: iOS скругляет сам.
await shot(icon(180, 0), 180, 180, 'apple-touch-icon.png');
await shot(icon(32, 6), 32, 32, 'favicon-32.png', true);
await shot(icon(192, 6), 192, 192, 'icon-192.png', true);
await shot(icon(512, 6), 512, 512, 'icon-512.png', true);
await browser.close();
console.log({ lessons, labs, labs3d });
