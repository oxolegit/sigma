/** Общие сведения о сайте: мета-теги, подвал, главная. */
export const SITE = {
  name: 'Sigma',
  title: 'Sigma — интерактивные курсы по физике реакторов',
  description: 'Бесплатные интерактивные курсы для подготовки к контрольным и экзаменам в магистратуре МИФИ: теория по учебнику, выводы по шагам, 2D- и 3D-лаборатории, пробная контрольная и шпаргалка формул.',
  repo: 'https://github.com/oxolegit/sigma',
  author: 'oxolegit',
  license: { name: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/deed.ru' },
  /** Картинка для превью ссылок, 1200×630 (scripts/og.mjs). */
  image: { src: '/og.png', width: 1200, height: 630, alt: 'Sigma — интерактивные курсы: формулы, лаборатории, 3D-сцены' },
  /** Цвет адресной строки — фон страницы (paper) в каждой теме. */
  themeColor: { light: '#f6f4ee', dark: '#14161a' },
} as const;
