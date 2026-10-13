import { useState } from 'react';
import {
  Button, LabFrame, LessonFooter, LessonNav, Quiz, Score, Segmented, Slider, Steps, type NavLesson,
} from '../../components';
import { getTheme, setTheme } from '../../lib/theme';

const chapters: { title: string; lessons: NavLesson[] }[] = [
  { title: 'Глава 1 · Нейтрон и среда', lessons: [
    { n: 1, title: 'Нейтрон как объект теории', ref: '§1.2', done: true },
    { n: 2, title: 'Источники нейтронов и деление', ref: '§1.3', done: true },
    { n: 3, title: 'Взаимодействия и сечения', ref: '§1.4–1.5', done: true },
    { n: 4, title: 'Длина свободного пробега', ref: '§1.6', current: true },
    { n: 5, title: 'Нейтронное поле: поток и ток', ref: '§1.7' },
    { n: 6, title: 'Группы и усреднение сечений' }] },
  { title: 'Глава 2 · Диффузия', lessons: [
    { n: 7, title: 'Баланс и закон Фика', ref: '§2.1–2.2' },
    { n: 8, title: 'Уравнение диффузии и граничные условия', ref: '§2.3–2.5' }] },
];

const quiz = [
  { n: '1', question: 'Полное макросечение среды увеличили вдвое. Как изменится средняя длина свободного пробега $\\lambda$?',
    options: [{ text: 'Увеличится вдвое' }, { text: 'Уменьшится вдвое', correct: true }, { text: 'Уменьшится в $e$ раз' }, { text: 'Не изменится' }],
    explain: 'Длина пробега обратна сечению: $\\lambda = 1/\\Sigma_t$, поэтому вдвое большее сечение даёт вдвое меньший пробег.' },
  { n: '2', question: 'Какая доля нейтронов узкого пучка пройдёт слой толщиной $\\lambda$ без взаимодействия?',
    options: [{ text: 'Половина' }, { text: '$1/e \\approx 37\\%$', correct: true }, { text: '$1 - 1/e \\approx 63\\%$' }],
    explain: '$P(\\lambda) = e^{-\\Sigma_t \\lambda} = e^{-1} \\approx 0.37$.' },
];

const fmt = (d: number) => (v: number) => v.toFixed(d);

/** Интерактивная часть витрины: всё, что живёт в островах. */
export default function Showcase() {
  const [sigma, setSigma] = useState(0.4);
  const [L, setL] = useState(8);
  const [scale, setScale] = useState('lin');
  const [done, setDone] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const lam = 1 / sigma;

  return (
    <div className="sg-dev-stack">
      <section>
        <h2>Тема</h2>
        <Button variant="ghost" size="sm" onClick={() => setTheme(getTheme() === 'dark' ? 'light' : 'dark')}>
          Переключить тему
        </Button>
      </section>

      <section>
        <h2>Button</h2>
        <div className="sg-dev-row">
          <Button variant="primary">Продолжить с урока 4</Button>
          <Button>Шпаргалка</Button>
          <Button variant="ghost">Пробная контрольная</Button>
          <Button variant="primary" size="sm">Следующий шаг</Button>
          <Button variant="ghost" size="sm">Показать все</Button>
          <Button href="#">Ссылка-кнопка</Button>
        </div>
      </section>

      <section>
        <h2>LabFrame · Slider · Segmented</h2>
        <LabFrame
          n="4.1" kind="2D" title="Ослабление узкого пучка в слое"
          actions={<Button variant="ghost" size="sm">Сбросить вид</Button>}
          readout={[
            { tex: '\\lambda', value: `= ${lam.toFixed(2)}`, unit: 'см' },
            { tex: 'I(L)/I_0', value: `= ${Math.exp(-sigma * L).toFixed(3)}` },
            { label: 'провзаимодействовало', value: (100 * (1 - Math.exp(-sigma * L))).toFixed(1), unit: '%' },
          ]}
          controls={<>
            <Slider tex="\Sigma_t" min={0.05} max={2} step={0.05} value={sigma} unit="см⁻¹" format={fmt(2)} onChange={setSigma} />
            <Slider label="Толщина слоя L" min={1} max={20} step={0.5} value={L} unit="см" format={fmt(1)} onChange={setL} />
            <Segmented label="Шкала" options={[{ value: 'lin', label: 'Линейная' }, { value: 'log', label: 'Логарифм' }]} value={scale} onChange={setScale} />
          </>}
          caption="Рис. 4.1. Сцена-заглушка: сам график появится вместе с лабораторией. Пунктир — $\lambda$."
        >
          <div className="sg-dev-stage">сцена</div>
        </LabFrame>
      </section>

      <section>
        <h2>Steps</h2>
        <Steps
          title="Вывод: средняя длина свободного пробега" initial={2}
          steps={[
            { note: 'Вероятность взаимодействия на пути $dx$ пропорциональна макросечению:', tex: 'dP_{\\text{вз}} = \\Sigma_t\\, dx' },
            { note: 'Доля $P(x)$ нейтронов без взаимодействия убывает на эту долю:', tex: '\\frac{dP}{dx} = -\\Sigma_t P \\;\\Rightarrow\\; P(x) = e^{-\\Sigma_t x}' },
            { note: 'Плотность вероятности первого взаимодействия:', tex: 'p(x) = \\Sigma_t\\, e^{-\\Sigma_t x}' },
            { note: 'Средний путь — первый момент $p(x)$:', tex: '\\lambda = \\int_0^{\\infty} x\\, \\Sigma_t e^{-\\Sigma_t x}\\, dx = \\frac{1}{\\Sigma_t}' },
          ]}
        />
      </section>

      <section>
        <h2>Quiz · Score</h2>
        <Score correct={score.correct} answered={score.answered} total={quiz.length} />
        {quiz.map((q) => (
          <Quiz key={q.n} {...q} onAnswer={(ok) => setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), answered: s.answered + 1 }))} />
        ))}
      </section>

      <section>
        <h2>LessonNav</h2>
        <div style={{ maxWidth: '100%', overflow: 'hidden' }}><LessonNav chapters={chapters} layout="strip" /></div>
        <div style={{ maxWidth: 'var(--sidebar)' }}><LessonNav chapters={chapters} /></div>
      </section>

      <section>
        <h2>LessonFooter</h2>
        <LessonFooter done={done} onToggle={() => setDone(!done)} next={{ n: 5, title: 'Нейтронное поле: поток и ток', href: '#' }} />
      </section>
    </div>
  );
}
